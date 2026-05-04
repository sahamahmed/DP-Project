import { CartItem } from '../interfaces/session.interface';

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`;
}

export function formatCartSummary(
  items: CartItem[],
  deliveryFee: number = 0,
): string {
  if (!items || items.length === 0) {
    return 'Your cart is empty.';
  }

  let summary = '🛒 *Your Cart*\n\n';
  let subtotal = 0;

  items.forEach((item, index) => {
    summary += `${index + 1}. ${item.name}\n`;
    summary += `   ${item.quantity} x ${formatCurrency(item.pricePerUnit)} = ${formatCurrency(item.subtotal)}\n\n`;
    subtotal += item.subtotal;
  });

  summary += `━━━━━━━━━━━━━━━\n`;
  summary += `Subtotal: ${formatCurrency(subtotal)}\n`;

  if (deliveryFee > 0) {
    summary += `Delivery Fee: ${formatCurrency(deliveryFee)}\n`;
    summary += `━━━━━━━━━━━━━━━\n`;
    summary += `*Total: ${formatCurrency(subtotal + deliveryFee)}*`;
  } else {
    summary += `*Total: ${formatCurrency(subtotal)}*`;
  }

  return summary;
}

export function formatOrderStatus(status: string): string {
  const statusEmojis: Record<string, string> = {
    pending: '⏳ Pending',
    confirmed: '✅ Confirmed',
    preparing: '👨‍🍳 Being Prepared',
    ready: '📦 Ready for Pickup/Delivery',
    'out-for-delivery': '🚗 Out for Delivery',
    delivered: '✅ Delivered',
    cancelled: '❌ Cancelled',
  };

  return statusEmojis[status] || status;
}

/**
 * Safely extracts the restaurant ID from a Restaurant document
 */
export function getRestaurantId(
  restaurant: { _id?: { toString(): string }; id?: string } | null,
): string {
  if (!restaurant) return '';
  if (restaurant._id) return restaurant._id.toString();
  if (restaurant.id) return restaurant.id;
  return '';
}
