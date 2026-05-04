import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from './message.interface';
import { whatsappQuery } from './whatsapp.interface';
import { UserState } from './session.interface';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { HydratedDocument } from 'mongoose';

export interface Orchestrator {
  handleMessage(
    context: BotContextService,
    query: whatsappQuery,
    user: UserState,
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): Promise<MessageType[]>;
}
