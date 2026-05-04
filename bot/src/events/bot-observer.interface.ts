export type BotEventType =
  | 'conversation.updated'
  | 'message.customer_received'
  | 'message.bot_sent';

export interface BotEvent {
  type: BotEventType;
  restaurantId: string;
  conversationId: string;
  payload: Record<string, any>;
}

export interface IBotObserver {
  /**
   * Called by the Subject whenever a bot event occurs.
   * Each concrete observer decides independently how to react.
   */
  update(event: BotEvent): void;
}
