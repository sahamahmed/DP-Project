import { Injectable } from '@nestjs/common';
import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';
import { asyncHandler } from '../utils/async-handler';
import { CartItem } from '../interfaces/session.interface';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { RESTAURANT_DIALOG_STEPS } from '../constants/dialog-steps';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { QuantityParser, ItemUnitConfig } from '../utils/quantity-parser';
import { MenuRepository } from '../repositories/menu.repository';

@Injectable()
export class CartHandlerService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly quantityParser: QuantityParser,
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
      session.conversationState.step ?? RESTAURANT_DIALOG_STEPS.VIEW_CART;

    switch (step) {
      case RESTAURANT_DIALOG_STEPS.VIEW_CART:
        return this.viewCart(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.MODIFY_CART:
        return this.modifyCart(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.ASK_NEW_QUANTITY:
        return this.askNewQuantity(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.UPDATE_CART_QUANTITY:
        return this.updateCartQuantity(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.CONFIRM_ORDER:
        return this.confirmOrder(context, message, restaurant);
      default:
        return {
          type: 'text',
          text: "Something went wrong. Let's try again.",
        };
    }
  }

  private async viewCart(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      await context.setConversationState({ dialogEnded: false });

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
          text: 'Your cart is empty. Start browsing our menu to add items!',
        };
      }

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
        .join('\n\n');

      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryFee = restaurant.deliveryFee || 0;
      const grandTotal = total + deliveryFee;

      const message = `🛒 *Your Cart*\n\n${cartSummary}\n\n━━━━━━━━━━━━━━━━\nSubtotal: Rs.${total}\nDelivery: Rs.${deliveryFee}\n*Grand Total: Rs.${grandTotal}*`;

      const listItems = cart.map((item, index) => {
        const qtyDisplay = QuantityParser.formatQuantity(
          item.quantity,
          item.baseUnit,
        );
        return {
          id: index.toString(),
          title: item.name,
          description: item.variantName
            ? `${item.variantName} | ${qtyDisplay} | Rs.${item.subtotal}`
            : `${qtyDisplay} | Rs.${item.subtotal}`,
        };
      });

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.MODIFY_CART,
      });

      return {
        type: 'list',
        bodyText: message,
        buttonText: 'Modify Cart',
        footerText: 'Select item to change quantity or remove',
        sections: [
          {
            title: 'Cart Items',
            rows: [
              ...listItems,
              {
                id: 'shop_more',
                title: '🛍️ Shop More',
                description: 'Browse menu and add more items',
              },
              {
                id: 'complete_order',
                title: '✅ Complete Order',
                description: `Total: Rs.${grandTotal}`,
              },
            ],
          },
        ],
      };
    });
  }

  private async modifyCart(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const selectedId = message.id;

      if (selectedId === 'complete_order') {
        return this.confirmOrder(context, message, restaurant);
      }

      if (selectedId === 'shop_more') {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
        });
        return {
          type: 'text',
          text: 'Browse our menu to add more items!',
        };
      }

      const session = await context.getSession();
      if (!session) {
        return {
          type: 'text',
          text: 'Session error. Please start again.',
        };
      }
      const cart: CartItem[] = session.conversationState.payload?.cart || [];
      const itemIndex = parseInt(selectedId || '0', 10);

      if (itemIndex < 0 || itemIndex >= cart.length) {
        return {
          type: 'text',
          text: 'Invalid selection. Please try again.',
        };
      }

      const selectedItem = cart[itemIndex];

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ASK_NEW_QUANTITY,
        payload: {
          ...session.conversationState.payload,
          editingItemIndex: itemIndex,
        },
      });

      const item = await this.menuRepository.getItemById(selectedItem.itemId);
      const baseUnit = item?.baseUnit || 'piece';

      const quantityText = QuantityParser.formatQuantity(
        selectedItem.quantity,
        baseUnit,
      );

      return {
        type: 'text',
        text: `*${selectedItem.name}*\nCurrent quantity: ${quantityText}\nPrice: Rs.${selectedItem.subtotal}\n\nEnter new quantity (or type "0" to remove):`,
      };
    });
  }

  private async askNewQuantity(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      // This method is not needed as modifyCart already asks for quantity
      // Redirect to updateCartQuantity
      return this.updateCartQuantity(context, message, restaurant);
    });
  }

  private async updateCartQuantity(
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

      const cart: CartItem[] = session.conversationState.payload?.cart || [];
      const itemIndex = session.conversationState.payload?.editingItemIndex;
      const quantityInput = message.text;

      if (
        itemIndex === undefined ||
        itemIndex < 0 ||
        itemIndex >= cart.length
      ) {
        return {
          type: 'text',
          text: 'Invalid item selection.',
        };
      }

      const cartItem = cart[itemIndex];

      const item = await this.menuRepository.getItemById(cartItem.itemId);
      if (!item) {
        return {
          type: 'text',
          text: 'Item not found.',
        };
      }

      const unitConfig: ItemUnitConfig = {
        unitType: item.unitType || 'countable',
        baseUnit: item.baseUnit || 'piece',
        minOrderQty: item.minOrderQty || 1,
        orderIncrement: item.orderIncrement || 1,
      };

      const parseResult = await this.quantityParser.parse(
        quantityInput,
        unitConfig,
        item.name,
      );

      if (!parseResult.valid) {
        // Stay on the same step and show error
        return {
          type: 'text',
          text: `❌ ${parseResult.error}\n\nPlease try again.`,
        };
      }

      // Handle quantity = 0 as removal
      if (parseResult.quantity === 0) {
        cart.splice(itemIndex, 1);
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.VIEW_CART,
          payload: {
            ...session.conversationState.payload,
            cart: cart,
            editingItemIndex: undefined,
          },
        });
        return this.viewCart(context, message, restaurant);
      }

      cartItem.quantity = parseResult.quantity;
      cartItem.subtotal = cartItem.quantity * cartItem.pricePerUnit;

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.VIEW_CART,
        payload: {
          ...session.conversationState.payload,
          cart: cart,
          editingItemIndex: undefined,
        },
      });

      return this.viewCart(context, message, restaurant);
    });
  }

  private async confirmOrder(
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
      const cart: CartItem[] = session.conversationState.payload?.cart || [];

      if (cart.length === 0) {
        return {
          type: 'text',
          text: 'Your cart is empty!',
        };
      }

      const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryFee = restaurant.deliveryFee || 0;
      const grandTotal = subtotal + deliveryFee;

      const orderSummary = cart
        .map((item) => `• ${item.name} x${item.quantity} = Rs.${item.subtotal}`)
        .join('\n');

      const billMessage = `━━━━━━━━━━━━━━━━━━━━
📋 *ORDER SUMMARY*
━━━━━━━━━━━━━━━━━━━━

${orderSummary}

━━━━━━━━━━━━━━━━━━━━
Subtotal:     Rs.${subtotal}
Delivery:     Rs.${deliveryFee}
━━━━━━━━━━━━━━━━━━━━
*TOTAL:       Rs.${grandTotal}*
━━━━━━━━━━━━━━━━━━━━

📍 Restaurant: ${restaurant.name}
📞 ${restaurant.whatsappNumber}

Thank you for your order! 🎉

(This is end of flow for now - checkout will be added next)`;

      await context.setConversationState({
        step: undefined,
        dialogEnded: true,
        payload: {
          ...session.conversationState.payload,
          clearAll: true,
        },
      });

      return {
        type: 'text',
        text: billMessage,
      };
    });
  }
}
