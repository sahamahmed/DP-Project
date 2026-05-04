import { Injectable, Logger } from '@nestjs/common';
import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { HydratedDocument } from 'mongoose';
import { Orchestrator } from '../interfaces/orchestrator.interface';
import { RestaurantOrchestratorService } from './restaurant-orchestrator.service';

@Injectable()
export class FastFoodOrchestratorService implements Orchestrator {
  private readonly logger = new Logger(FastFoodOrchestratorService.name);

  constructor(
    private readonly defaultOrchestrator: RestaurantOrchestratorService,
  ) {}

  async handleMessage(
    context: BotContextService,
    query: whatsappQuery,
    user: { name: string; phoneNumber: string },
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): Promise<MessageType[]> {
    this.logger.debug(`FastFood flow for ${user.phoneNumber}`);
    // Future: replace with streamlined fast-food dialog logic
    return this.defaultOrchestrator.handleMessage(context, query, user, restaurant);
  }
}
