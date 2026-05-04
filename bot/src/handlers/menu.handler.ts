/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';
import { asyncHandler } from '../utils/async-handler';
import { MenuRepository } from '../repositories/menu.repository';
import { CartItem } from '../interfaces/session.interface';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { RESTAURANT_DIALOG_STEPS } from '../constants/dialog-steps';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { QuantityParser, ItemUnitConfig } from '../utils/quantity-parser';

@Injectable()
export class MenuHandlerService {
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

    // Handle cart list selections first
    if (message.id === 'shop_more') {
      // Reset and show category list
      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        dialogEnded: false,
        payload: {
          ...session.conversationState.payload,
          selectedCategory: undefined,
          selectedItemId: undefined,
        },
      });
      return this.selectCategory(context, message, restaurant);
    }

    if (message.id === 'complete_order') {
      return this.completeOrder(context, restaurant);
    }

    // Handle cart item modification
    if (message.id?.startsWith('item_')) {
      return this.modifyCartItem(context, message, restaurant);
    }

    const step =
      session.conversationState.step ?? RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY;

    switch (step) {
      case RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY:
        return this.selectCategory(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.SELECT_ITEM:
        return this.selectItem(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.SELECT_VARIANT:
        return this.selectVariant(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.ASK_QUANTITY:
        return this.askQuantity(context, message, restaurant);
      case RESTAURANT_DIALOG_STEPS.ADD_TO_CART:
        return this.addToCart(context, message, restaurant);
      default:
        return {
          type: 'text',
          text: "Oops! Something went wrong. Let's start over.",
        };
    }
  }

  private async selectCategory(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      await context.setConversationState({ dialogEnded: false });

      const restaurantId = (restaurant as any)._id.toString();
      const categories =
        await this.menuRepository.getMenuCategories(restaurantId);

      if (!categories || categories.length === 0) {
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
        });
        return {
          type: 'text',
          text: 'Sorry, our menu is not available at the moment. Please try again later.',
        };
      }

      const listItems = categories.map((category) => ({
        id: category,
        title: category,
        description: '',
      }));

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.SELECT_ITEM,
      });

      return {
        type: 'list',
        bodyText: `Please select a category to browse our delicious items.`,
        buttonText: 'View Menu',
        sections: [
          {
            title: 'Menu Categories',
            rows: listItems,
          },
        ],
      };
    });
  }

  private async selectItem(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const category = message.id;

      if (!category) {
        // Reset to category selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return this.selectCategory(context, message, restaurant);
      }

      const restaurantId = (restaurant as any)._id.toString();
      const items = await this.menuRepository.getItemsByCategory(
        restaurantId,
        category,
      );

      if (!items || items.length === 0) {
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: `No items available in ${category}. Please select another category.`,
        };
      }

      const listItems = items.map((item) => {
        const hasVariants = item.variants && item.variants.length > 0;
        let priceDisplay: string;

        if (hasVariants) {
          priceDisplay = `From Rs.${item.price}`;
        } else if (item.unitType === 'weight' && item.baseUnit === 'kg') {
          priceDisplay = `Rs.${item.price}/kg`;
        } else if (item.unitType === 'volume' && item.baseUnit === 'liter') {
          priceDisplay = `Rs.${item.price}/L`;
        } else {
          priceDisplay = `Rs.${item.price}`;
        }

        return {
          id: item._id.toString(),
          title: item.name,
          description: `${priceDisplay} | ${item.description || item.baseUnit}`,
        };
      });

      const currentSession = await context.getSession();
      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ASK_QUANTITY,
        payload: {
          ...(currentSession?.conversationState.payload || {}),
          selectedCategory: category,
        },
      });

      return {
        type: 'list',
        headerText: category,
        bodyText: `Here are our ${category} items. Select an item to add to your cart.`,
        buttonText: 'Select Item',
        sections: [
          {
            title: category,
            rows: listItems,
          },
        ],
      };
    });
  }

  private async askQuantity(
    context: BotContextService,
    message: whatsappQuery,
    restaurant: Restaurant,
  ): Promise<MessageType> {
    return await asyncHandler(context, async () => {
      const itemId = message.id;

      if (!itemId) {
        // Reset to category selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return this.selectCategory(context, message, restaurant);
      }

      const item = await this.menuRepository.getItemById(itemId);

      if (!item) {
        // Reset to category selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: 'Sorry, this item is no longer available. Please browse the menu again.',
        };
      }

      const session = await context.getSession();
      if (!session) {
        return {
          type: 'text',
          text: 'Session error. Please start again.',
        };
      }

      // Check if item has variants - if so, show variant selection first
      const availableVariants = (item.variants || []).filter(
        (v) => v.isAvailable !== false,
      );

      if (availableVariants.length > 0) {
        // Store item and redirect to variant selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_VARIANT,
          payload: {
            ...session.conversationState.payload,
            selectedItemId: itemId,
          },
        });

        const variantRows = availableVariants.map((variant, index) => ({
          id: `variant_${index}`,
          title: variant.name,
          description: `Rs.${variant.price}`,
        }));

        return {
          type: 'list',
          headerText: item.name,
          bodyText: `Please select a size/variant for *${item.name}*:`,
          buttonText: 'Select Size',
          sections: [
            {
              title: 'Available Sizes',
              rows: variantRows,
            },
          ],
        };
      }

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ADD_TO_CART,
        payload: {
          ...session.conversationState.payload,
          selectedItemId: itemId,
          selectedVariantIndex: undefined,
        },
      });

      let quantityPrompt: string;
      if (item.unitType === 'weight') {
        const minDisplay =
          item.minOrderQty === 0.25
            ? '250g'
            : item.minOrderQty === 0.5
              ? '500g'
              : `${item.minOrderQty}kg`;
        quantityPrompt = `How much *${item.name}* would you like?\n(Min: ${minDisplay}, Rs.${item.price}/kg)`;
      } else if (item.unitType === 'volume') {
        const minDisplay =
          item.minOrderQty === 0.25
            ? '250ml'
            : item.minOrderQty === 0.5
              ? '500ml'
              : `${item.minOrderQty}L`;
        quantityPrompt = `How much *${item.name}* would you like?\n(Min: ${minDisplay}, Rs.${item.price}/L)`;
      } else {
        quantityPrompt = `How many *${item.name}* would you like?`;
      }

      return {
        type: 'text',
        text: quantityPrompt,
      };
    });
  }

  private async selectVariant(
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

      const itemId = session.conversationState.payload?.selectedItemId;

      if (!itemId) {
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return this.selectCategory(context, message, restaurant);
      }

      // Parse variant selection from message.id (format: "variant_0", "variant_1", etc.)
      const variantMatch = message.id?.match(/^variant_(\d+)$/);
      if (!variantMatch) {
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: 'Invalid selection. Please browse the menu again.',
        };
      }

      const variantIndex = parseInt(variantMatch[1], 10);
      const item = await this.menuRepository.getItemById(itemId);

      if (!item) {
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: 'Sorry, this item is no longer available. Please browse the menu again.',
        };
      }

      const availableVariants = (item.variants || []).filter(
        (v) => v.isAvailable !== false,
      );

      if (variantIndex < 0 || variantIndex >= availableVariants.length) {
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: 'Invalid variant selection. Please browse the menu again.',
        };
      }

      const selectedVariant = availableVariants[variantIndex];

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ADD_TO_CART,
        payload: {
          ...session.conversationState.payload,
          selectedVariantIndex: variantIndex,
        },
      });

      let quantityPrompt: string;
      const itemWithVariant = `${item.name} (${selectedVariant.name})`;

      if (item.unitType === 'weight') {
        const minDisplay =
          item.minOrderQty === 0.25
            ? '250g'
            : item.minOrderQty === 0.5
              ? '500g'
              : `${item.minOrderQty}kg`;
        quantityPrompt = `How much *${itemWithVariant}* would you like?\n(Min: ${minDisplay})`;
      } else if (item.unitType === 'volume') {
        const minDisplay =
          item.minOrderQty === 0.25
            ? '250ml'
            : item.minOrderQty === 0.5
              ? '500ml'
              : `${item.minOrderQty}L`;
        quantityPrompt = `How much *${itemWithVariant}* would you like?\n(Min: ${minDisplay})`;
      } else {
        quantityPrompt = `How many *${itemWithVariant}* would you like?`;
      }

      return {
        type: 'text',
        text: quantityPrompt,
      };
    });
  }

  private async addToCart(
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

      const itemId = session.conversationState.payload?.selectedItemId;
      const selectedVariantIndex =
        session.conversationState.payload?.selectedVariantIndex;
      const quantityInput = message.text;

      if (!itemId) {
        // Reset to category selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return this.selectCategory(context, message, restaurant);
      }

      const item = await this.menuRepository.getItemById(itemId);

      if (!item) {
        // Reset to category selection
        await context.setConversationState({
          step: RESTAURANT_DIALOG_STEPS.SELECT_CATEGORY,
        });
        return {
          type: 'text',
          text: 'Sorry, this item is no longer available. Please browse the menu again.',
        };
      }

      let itemPrice = item.price;
      let variantName: string | undefined;

      if (selectedVariantIndex !== undefined) {
        const availableVariants = (item.variants || []).filter(
          (v) => v.isAvailable !== false,
        );
        if (
          selectedVariantIndex >= 0 &&
          selectedVariantIndex < availableVariants.length
        ) {
          const selectedVariant = availableVariants[selectedVariantIndex];
          itemPrice = selectedVariant.price;
          variantName = selectedVariant.name;
        }
      }

      const currentCart: CartItem[] =
        session.conversationState.payload?.cart || [];
      const editingItemIndex =
        session.conversationState.payload?.editingItemIndex;

      // Handle "0" to remove item (only when editing)
      if (
        quantityInput.trim() === '0' &&
        editingItemIndex !== undefined &&
        editingItemIndex >= 0 &&
        editingItemIndex < currentCart.length
      ) {
        currentCart.splice(editingItemIndex, 1);

        // Save cart and show updated cart
        await context.setConversationState({
          step: undefined,
          dialogEnded: true,
          payload: {
            ...session.conversationState.payload,
            cart: currentCart,
            selectedCategory: undefined,
            selectedItemId: undefined,
            selectedVariantIndex: undefined,
            editingItemIndex: undefined,
          },
        });

        if (currentCart.length === 0) {
          return {
            type: 'text',
            text: '✅ Item removed. Your cart is now empty. Browse our menu to add items!',
          };
        }

        const cartSummary = currentCart
          .map((cartItem, index) => {
            const displayName = cartItem.variantName
              ? `${cartItem.name} (${cartItem.variantName})`
              : cartItem.name;
            const lineItem = QuantityParser.formatCartLineItem(
              cartItem.quantity,
              cartItem.pricePerUnit,
              cartItem.subtotal,
              cartItem.baseUnit,
            );
            return `${index + 1}. ${displayName}\n   ${lineItem}`;
          })
          .join('\n\n');

        const total = currentCart.reduce(
          (sum, cartItem) => sum + cartItem.subtotal,
          0,
        );
        const deliveryFee = restaurant.deliveryFee || 0;
        const grandTotal = total + deliveryFee;

        const cartMessage = `✅ *Item removed*\n\n🛒 *Your Cart*\n\n${cartSummary}\n\n━━━━━━━━━━━━━━━━\nSubtotal: Rs.${total}\nDelivery: Rs.${deliveryFee}\n*Grand Total: Rs.${grandTotal}*`;

        const listItems = currentCart.map((cartItem, index) => {
          const qtyDisplay = QuantityParser.formatQuantity(
            cartItem.quantity,
            cartItem.baseUnit,
          );
          return {
            id: `item_${index}`,
            title: cartItem.name,
            description: cartItem.variantName
              ? `${cartItem.variantName} | ${qtyDisplay} | Rs.${cartItem.subtotal}`
              : `${qtyDisplay} | Rs.${cartItem.subtotal}`,
          };
        });

        return {
          type: 'list',
          bodyText: cartMessage,
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

      if (
        editingItemIndex !== undefined &&
        editingItemIndex >= 0 &&
        editingItemIndex < currentCart.length
      ) {
        currentCart[editingItemIndex].quantity = parseResult.quantity;
        currentCart[editingItemIndex].subtotal =
          parseResult.quantity * currentCart[editingItemIndex].pricePerUnit;
      } else {
        const existingItemIndex = currentCart.findIndex(
          (cartItem) =>
            cartItem.itemId === itemId && cartItem.variantName === variantName,
        );

        const subtotal = parseResult.quantity * itemPrice;

        if (existingItemIndex >= 0) {
          currentCart[existingItemIndex].quantity += parseResult.quantity;
          currentCart[existingItemIndex].subtotal =
            currentCart[existingItemIndex].quantity *
            currentCart[existingItemIndex].pricePerUnit;
        } else {
          currentCart.push({
            itemId: item._id.toString(),
            name: item.name,
            variantName: variantName,
            quantity: parseResult.quantity,
            pricePerUnit: itemPrice,
            baseUnit: unitConfig.baseUnit,
            subtotal: subtotal,
          });
        }
      }

      // Save cart and show cart list directly
      await context.setConversationState({
        step: undefined,
        dialogEnded: true,
        payload: {
          ...session.conversationState.payload,
          cart: currentCart,
          selectedCategory: undefined,
          selectedItemId: undefined,
          selectedVariantIndex: undefined,
          editingItemIndex: undefined,
        },
      });

      // Check if cart is empty after removal
      if (currentCart.length === 0) {
        return {
          type: 'text',
          text: 'Your cart is now empty. Browse our menu to add items!',
        };
      }

      const cartSummary = currentCart
        .map((cartItem, index) => {
          const displayName = cartItem.variantName
            ? `${cartItem.name} (${cartItem.variantName})`
            : cartItem.name;
          const lineItem = QuantityParser.formatCartLineItem(
            cartItem.quantity,
            cartItem.pricePerUnit,
            cartItem.subtotal,
            cartItem.baseUnit,
          );
          return `${index + 1}. ${displayName}\n   ${lineItem}`;
        })
        .join('\n\n');

      const total = currentCart.reduce(
        (sum, cartItem) => sum + cartItem.subtotal,
        0,
      );
      const deliveryFee = restaurant.deliveryFee || 0;
      const grandTotal = total + deliveryFee;

      const quantityText = QuantityParser.formatQuantity(
        parseResult.quantity,
        unitConfig.baseUnit,
      );

      // Different message based on whether we're adding or editing
      const displayName = variantName
        ? `${item.name} (${variantName})`
        : item.name;
      const actionText =
        editingItemIndex !== undefined
          ? 'Updated'
          : `Added ${quantityText} of ${displayName}`;
      const cartMessage = `✅ *${actionText}*\n\n🛒 *Your Cart*\n\n${cartSummary}\n\n━━━━━━━━━━━━━━━━\nSubtotal: Rs.${total}\nDelivery: Rs.${deliveryFee}\n*Grand Total: Rs.${grandTotal}*`;

      const listItems = currentCart.map((cartItem, index) => {
        const qtyDisplay = QuantityParser.formatQuantity(
          cartItem.quantity,
          cartItem.baseUnit,
        );
        return {
          id: `item_${index}`,
          title: cartItem.name,
          description: cartItem.variantName
            ? `${cartItem.variantName} | ${qtyDisplay} | Rs.${cartItem.subtotal}`
            : `${qtyDisplay} | Rs.${cartItem.subtotal}`,
        };
      });

      return {
        type: 'list',
        bodyText: cartMessage,
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

  private async completeOrder(
    context: BotContextService,
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

      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ASK_DELIVERY_ADDRESS,
        dialogEnded: false,
        intentName: 'checkout',
      });

      return {
        type: 'text',
        text: `📍 *Delivery Address*\n\nShare your location pin OR type your complete delivery address:`,
      };
    });
  }

  private async modifyCartItem(
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
      const cart: CartItem[] = session.conversationState.payload?.cart || [];
      const itemIndex = parseInt(message.id?.replace('item_', '') || '0', 10);

      if (itemIndex < 0 || itemIndex >= cart.length) {
        return {
          type: 'text',
          text: 'Invalid selection. Please try again.',
        };
      }

      const selectedItem = cart[itemIndex];

      // Store the item index for quantity update
      await context.setConversationState({
        step: RESTAURANT_DIALOG_STEPS.ADD_TO_CART,
        dialogEnded: false,
        payload: {
          ...session.conversationState.payload,
          selectedItemId: selectedItem.itemId,
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
}
