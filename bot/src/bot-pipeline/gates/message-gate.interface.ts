import { HydratedDocument } from 'mongoose';
import { Restaurant } from '../../database/schemas/restaurant.schema';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { whatsappQuery } from '../../interfaces/whatsapp.interface';

export interface MessageGateContext {
  message: any;
  sender: string;
  messageId: string;
  userName: string;
  receiver: string;
  restaurant?: Restaurant | HydratedDocument<Restaurant>;
  credentials?: RestaurantCredentials;
  query?: whatsappQuery;
  /** Set by AgentModeGate when it short-circuits — lets BotService distinguish
   *  agent-mode blocks from other gate rejections (freshness, active-hours, etc.) */
  wasAgentModeBlock?: boolean;
}

export interface IMessageGate {
  setNext(gate: IMessageGate): IMessageGate;
  handle(ctx: MessageGateContext): Promise<boolean>;
}
