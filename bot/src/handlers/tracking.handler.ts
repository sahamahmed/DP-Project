import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';
import { asyncHandler } from '../utils/async-handler';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { RESTAURANT_DIALOG_STEPS } from '../constants/dialog-steps';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { Order } from '../database/schemas/order.schema';

@Injectable()
export class TrackingHandlerService {
  private readonly logger = new Logger(TrackingHandlerService.name);

  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async handle(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    const session = await context.getSession();
    if (!session) {
      return {
        type: 'text',
        text: 'Session error. Please start again.',
      };
    }

    const step =
      session.conversationState.step ?? RESTAURANT_DIALOG_STEPS.ASK_ORDER_ID;

    switch (step) {
      case RESTAURANT_DIALOG_STEPS.ASK_ORDER_ID:
        return this.askOrderId(context);
      case RESTAURANT_DIALOG_STEPS.SHOW_ORDER_DETAILS:
        return this.showOrderDetails(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.AWAIT_DELIVERY_CONFIRM:
        return this.handleDeliveryConfirm(context, message);
      default:
        return {
          type: 'text',
          text: "Something went wrong. Let's try again.",
        };
    }
  }

  private async askOrderId(context: BotContextService): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.SHOW_ORDER_DETAILS,
        dialogEnded: false,
      });

      return {
        type: 'text',
        text: `📦 *Track Your Order*\n\nPlease enter your Order ID\n(e.g., ORD-20260101-12345):`,
      };
    });
  }

  private async showOrderDetails(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const session = await context.getSession();
      if (!session) {
        return {
          type: 'text',
          text: 'Session error. Please start again.',
        };
      }

      const orderId = message.text?.trim().toUpperCase();

      if (!orderId || orderId.length < 5) {
        return {
          type: 'text',
          text: '❌ Please enter a valid Order ID (e.g., ORD-20260101-12345)',
        };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get restaurantId - handle both ObjectId and string (from cache)
      const restaurantIdStr =
        (restaurant as any)._id?.toString() || (restaurant as any)._id;
      const order = await this.orderModel
        .findOne({
          orderId: orderId,
          customerPhone: session.userState.phoneNumber,
          $or: [
            { restaurantId: restaurantIdStr },
            { restaurantId: new Types.ObjectId(restaurantIdStr) },
          ],
          createdAt: { $gte: yesterday },
        })
        .exec();

      if (!order) {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
          intentName: undefined,
        });

        return {
          type: 'text',
          text: `❌ Order not found.\n\nPlease check:\n• Order ID is correct\n• Order was placed in last 24 hours\n• Order belongs to this phone number`,
        };
      }

      const statusEmoji = {
        pending: '⏳',
        confirmed: '✅',
        preparing: '👨‍🍳',
        ready: '📦',
        out_for_delivery: '🚚',
        delivered: '🎉',
        cancelled: '❌',
      };

      const statusText = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        preparing: 'Being Prepared',
        ready: 'Ready for Pickup',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      };

      const itemsList = order.items
        .map((item) => {
          const displayName = item.variantName
            ? `${item.name} (${item.variantName})`
            : item.name;
          return `• ${displayName} x${item.quantity} = Rs.${item.subtotal}`;
        })
        .join('\n');

      const createdAt = new Date((order as any).createdAt);
      const timeStr = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = createdAt.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      });

      let deliveryInfo = '';
      if (order.deliveryInfo.location) {
        deliveryInfo = `📍 ${order.deliveryInfo.address}`;
      }

      const detailText = `📦 *Order Details*

━━━━━━━━━━━━━━━━━━━━
Order ID: *${order.orderId}*
Status: ${statusEmoji[order.status]} *${statusText[order.status]}*
━━━━━━━━━━━━━━━━━━━━

🛒 *Items:*
${itemsList}

━━━━━━━━━━━━━━━━━━━━
Subtotal:     Rs.${order.subtotal}
Delivery:     Rs.${order.deliveryFee}
*Total:       Rs.${order.total}*
━━━━━━━━━━━━━━━━━━━━

${deliveryInfo}
${order.deliveryInfo.instructions ? `📝 ${order.deliveryInfo.instructions}` : ''}

💵 Payment: ${order.paymentMethod}

🕐 Ordered: ${timeStr}, ${dateStr}

━━━━━━━━━━━━━━━━━━━━

📞 Need help? Select Talk to Agent in menu or call ${restaurant.whatsappNumber}`;

      const canMarkDelivered =
        order.status !== 'delivered' && order.status !== 'cancelled';

      if (canMarkDelivered) {
        // Store the orderId in session so the next turn can update it
        // without prompting the customer again
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.AWAIT_DELIVERY_CONFIRM,
          dialogEnded: false,
          payload: {
            ...session.conversationState.payload,
            trackingOrderId: order.orderId,
          },
        });

        return {
          type: 'button',
          bodyText: detailText,
          buttons: ['🏠 Back to Menu', '✅ Mark as Delivered'],
        };
      }

      // Terminal status — close dialog immediately
      await context.setConversationState({
        step: undefined,
        dialogEnded: true,
        intentName: undefined,
      });

      return { type: 'text', text: detailText };
    });
  }

  private async handleDeliveryConfirm(
    context: BotContextService,
    message: whatsappQuery,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const session = await context.getSession();
      const choice = message.text?.trim() ?? '';
      const orderId = session?.conversationState?.payload?.trackingOrderId;

      await context.setConversationState({
        step: undefined,
        dialogEnded: true,
        intentName: undefined,
        payload: { ...session?.conversationState?.payload, trackingOrderId: undefined },
      });

      if (choice !== '✅ Mark as Delivered' || !orderId) {
        return { type: 'text', text: '🏠 Returning to menu. Type *Menu* anytime to browse.' };
      }

      await this.orderModel
        .findOneAndUpdate(
          { orderId },
          { $set: { status: 'delivered', deliveredAt: new Date() } },
        )
        .exec();

      return {
        type: 'text',
        text: `🎉 Thank you for confirming! Order *${orderId}* has been marked as delivered.\n\nWe hope you enjoyed your meal! 😊`,
      };
    });
  }
}
