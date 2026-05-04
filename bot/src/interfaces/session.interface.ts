export interface CartItem {
  itemId: string;
  name: string;
  variantName?: string;
  quantity: number;
  baseUnit: string;
  pricePerUnit: number;
  subtotal: number;
}

export interface CheckoutData {
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deliveryInstructions?: string;
  paymentMethod?: 'COD' | 'Card' | 'JazzCash' | 'Easypaisa';
}

export interface Payload {
  cart?: CartItem[];
  selectedCategory?: string;
  selectedItemId?: string;
  selectedVariantIndex?: number;
  checkoutData?: CheckoutData;
  orderId?: string;
  editingItemIndex?: number;
  clearAll?: boolean;
  trackingOrderId?: string;
}

export interface UserState {
  name: string;
  phoneNumber: string;
}

export type IntentName =
  | 'browsing'
  | 'checkout'
  | 'tracking'
  | 'agent'
  | 'greeting'
  | 'unknown';

export interface ConversationState {
  intentName?: IntentName;
  step?: number;
  payload?: Payload;
  dialogEnded?: boolean;
  agentMode?: boolean;
  conversationId?: string;
}

export interface UserSession {
  userState: UserState;
  conversationState: ConversationState;
}
