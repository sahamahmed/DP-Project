/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';
import { asyncHandler } from '../utils/async-handler';
import { CartItem, CheckoutData } from '../interfaces/session.interface';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { RESTAURANT_DIALOG_STEPS } from '../constants/dialog-steps';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { Order } from '../database/schemas/order.schema';
import { QuantityParser } from '../utils/quantity-parser';
import { GroqQueueService } from '../groq-queue/groq-queue.service';
import { NotificationService } from '../services/notification.service';
import { toErrorMessage } from '../utils/error.utils';

@Injectable()
export class CheckoutHandlerService {
  private readonly logger = new Logger(CheckoutHandlerService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private readonly groqQueueService: GroqQueueService,
    private readonly notificationService: NotificationService,
  ) {}

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
      session.conversationState.step ?? RESTAURANT_DIALOG_STEPS.CHECKOUT_START;

    switch (step) {
      case RESTAURANT_DIALOG_STEPS.CHECKOUT_START:
        return this.startCheckout(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_ADDRESS:
        return this.saveDeliveryAddress(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_INSTRUCTIONS:
        return this.saveDeliveryInstructionsAndPlaceOrder(
          context,
          message,
          restaurant,
        );
      default:
        return {
          type: 'text',
          text: "Something went wrong. Let's try again.",
        };
    }
  }

  private async startCheckout(
    context: BotContextService,
    _message: whatsappQuery,
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

      const cart: CartItem[] = session.conversationState.payload?.cart || [];

      if (cart.length === 0) {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
        });
        return {
          type: 'text',
          text: 'Your cart is empty! Browse our menu to add items.',
        };
      }

      const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryFee = restaurant.deliveryFee || 0;
      const minOrder = restaurant.minOrderAmount || 0;

      if (subtotal < minOrder) {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
          intentName: 'browsing',
        });
        return {
          type: 'text',
          text: `❌ Minimum order amount is Rs.${minOrder}\n\nYour cart total is Rs.${subtotal}.\nPlease add Rs.${minOrder - subtotal} more to proceed.`,
        };
      }

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_ADDRESS,
        dialogEnded: false,
      });

      const cartSummary = cart
        .map((item, index) => {
          const displayName = item.variantName
            ? `${item.name} (${item.variantName})`
            : item.name;
          const lineItem = QuantityParser.formatCartLineItem(
            item.quantity,
            item.pricePerUnit,
            item.subtotal,
            item.baseUnit,
          );
          return `${index + 1}. ${displayName}\n   ${lineItem}`;
        })
        .join('\n');

      const grandTotal = subtotal + deliveryFee;

      return {
        type: 'text',
        text: `🛒 *Your Order Summary*\n\n${cartSummary}\n\n━━━━━━━━━━━━━━━━\nSubtotal: Rs.${subtotal}\nDelivery: Rs.${deliveryFee}\n*Grand Total: Rs.${grandTotal}*\n━━━━━━━━━━━━━━━━\n\n📍 *Delivery Address*\n\nShare your location pin OR type your complete delivery address:`,
      };
    });
  }

  private async saveDeliveryAddress(
    context: BotContextService,
    message: whatsappQuery,
    _restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const session = await context.getSession();
      if (!session) {
        return {
          type: 'text',
          text: 'Session error. Please start again.',
        };
      }

      if (message.type === 'location' && message.location) {
        const checkoutData: CheckoutData = {
          ...(session.conversationState.payload?.checkoutData || {}),
          deliveryAddress: 'Location Pin Shared',
          deliveryName: session.userState.name,
          deliveryPhone: session.userState.phoneNumber,
          location: {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
          },
        };

        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_INSTRUCTIONS,
          payload: {
            ...session.conversationState.payload,
            checkoutData,
          },
        });

        return {
          type: 'text',
          text: `✅ Location saved!\n\n📝 *Delivery Instructions (Optional)*\n\nAny special instructions for delivery? (e.g., "Ring the bell", "Leave at gate")\n\nType "skip" if none.`,
        };
      }

      const userInput = message.text?.trim();
      if (!userInput || userInput.length < 5) {
        return {
          type: 'text',
          text: '❌ Please share your location pin OR type a complete delivery address.',
        };
      }

      const addressValidation = await this.extractAddress(userInput);

      if (!addressValidation.isValid) {
        return {
          type: 'text',
          text: `❌ Please provide a valid delivery address.\n\nYour address should include:\n- House/building number\n- Street or area name\n- Landmark reference\n\nOr share your location pin instead.`,
        };
      }

      const checkoutData: CheckoutData = {
        ...(session.conversationState.payload?.checkoutData || {}),
        deliveryAddress: addressValidation.address,
        deliveryName: session.userState.name,
        deliveryPhone: session.userState.phoneNumber,
      };

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_INSTRUCTIONS,
        payload: {
          ...session.conversationState.payload,
          checkoutData,
        },
      });

      return {
        type: 'text',
        text: `✅ Address saved!\n\n📝 *Delivery Instructions (Optional)*\n\nAny special instructions for delivery? (e.g., "Ring the bell", "Leave at gate")\n\nType "skip" if none.`,
      };
    });
  }

  private async extractAddress(
    input: string,
  ): Promise<{ isValid: boolean; address?: string; error?: string }> {
    try {
      const systemPrompt = `You are an address validator for a food delivery system in Pakistan. Validate if the user input is a proper delivery address.

VALID ADDRESS must contain:
- House/building number or name
- Street or area name
- At least one landmark or location reference

INVALID: Greetings, questions, random text, incomplete info

OUTPUT (JSON):
{
  "isValid": true/false,
  "address": "cleaned and formatted address",
  "error": "reason if invalid"
}`;

      const userPrompt = `User input: "${input}"

Is this a valid delivery address? Extract and format it.`;

      const response = await this.groqQueueService.queueChatRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        response_format: {
          type: 'json_object',
        },
      });

      const result = JSON.parse(response);
      return result;
    } catch (error) {
      this.logger.error(`Address extraction failed: ${toErrorMessage(error)}`);
      return {
        isValid: false,
        error: 'Could not process address. Please try again.',
      };
    }
  }

  private async saveDeliveryInstructionsAndPlaceOrder(
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

      const checkoutData: CheckoutData =
        session.conversationState.payload?.checkoutData || {};

      const text = message.text?.trim();
      if (text && text.toLowerCase() !== 'skip') {
        checkoutData.deliveryInstructions = text;
      }

      checkoutData.paymentMethod = 'COD';

      // Directly place the order - no confirmation step needed
      const cart: CartItem[] = session.conversationState.payload?.cart || [];

      if (cart.length === 0) {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
        });
        return {
          type: 'text',
          text: 'Your cart is empty!',
        };
      }

      const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryFee = restaurant.deliveryFee || 0;
      const grandTotal = subtotal + deliveryFee;

      // Generate order ID
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const orderId = `ORD-${dateStr}-${randomNum}`;

      // Create order - ensure restaurantId is ObjectId (may be string if from cache)
      const restaurantIdStr =
        (restaurant as any)._id?.toString() || (restaurant as any)._id;
      const order = new this.orderModel({
        orderId,
        restaurantId: new Types.ObjectId(restaurantIdStr),
        customerPhone: session.userState.phoneNumber,
        customerName: session.userState.name,
        items: cart.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
          baseUnit: item.baseUnit,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.subtotal,
        })),
        subtotal,
        deliveryFee,
        total: grandTotal,
        deliveryInfo: {
          name: checkoutData.deliveryName || session.userState.name,
          phoneNumber:
            checkoutData.deliveryPhone || session.userState.phoneNumber,
          address: checkoutData.deliveryAddress || '',
          location: checkoutData.location,
          instructions: checkoutData.deliveryInstructions,
        },
        paymentMethod: checkoutData.paymentMethod || 'COD',
        status: 'pending',
        source: 'bot',
      });

      try {
        await order.save();
        this.logger.log(`Order placed: ${orderId}`);

        // Create notification for new order (non-blocking)
        this.notificationService.notifyOrderCreated(
          restaurantIdStr,
          orderId,
          session.userState.name || session.userState.phoneNumber,
          grandTotal,
          'bot',
        );

        // Clear cart and checkout data
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
          intentName: undefined,
          payload: {
            cart: [],
            checkoutData: undefined,
            orderId,
          },
        });

        const cartSummary = cart
          .map((item) => {
            const displayName = item.variantName
              ? `${item.name} (${item.variantName})`
              : item.name;
            return `• ${displayName} x${item.quantity} = Rs.${item.subtotal}`;
          })
          .join('\n');

        return {
          type: 'text',
          text: `🎉 *Order Placed Successfully!*

━━━━━━━━━━━━━━━━━━━━
📋 *Order ID:* ${orderId}
━━━━━━━━━━━━━━━━━━━━

${cartSummary}

━━━━━━━━━━━━━━━━━━━━
Subtotal:     Rs.${subtotal}
Delivery:     Rs.${deliveryFee}
━━━━━━━━━━━━━━━━━━━━
*TOTAL:       Rs.${grandTotal}*
━━━━━━━━━━━━━━━━━━━━

📍 *Delivering to:*
${checkoutData.deliveryAddress}
${checkoutData.deliveryInstructions ? `📝 ${checkoutData.deliveryInstructions}` : ''}

💵 *Payment:* Cash on Delivery

⏱️ Estimated delivery: 30-45 minutes

━━━━━━━━━━━━━━━━━━━━
📞 Need help?  Select Talk to Agent Option in menu or Call us at ${restaurant.whatsappNumber}
Thank you for choosing ${restaurant.name}!`,
        };
      } catch (error) {
        this.logger.error(`Failed to save order: ${toErrorMessage(error)}`);
        return {
          type: 'text',
          text: 'Failed to place order. Please try again or contact support.',
        };
      }
    });
  }
}
