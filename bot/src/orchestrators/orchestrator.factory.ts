import { Injectable, Logger } from '@nestjs/common';
import { HydratedDocument } from 'mongoose';
import { Orchestrator } from '../interfaces/orchestrator.interface';
import {
  Restaurant,
  RestaurantType,
} from '../database/schemas/restaurant.schema';
import { RestaurantOrchestratorService } from './restaurant-orchestrator.service';
import { FastFoodOrchestratorService } from './fast-food-orchestrator.service';
import { FineDiningOrchestratorService } from './fine-dining-orchestrator.service';

@Injectable()
export class OrchestratorFactory {
  private readonly logger = new Logger(OrchestratorFactory.name);

  constructor(
    private readonly defaultOrchestrator: RestaurantOrchestratorService,
    private readonly fastFoodOrchestrator: FastFoodOrchestratorService,
    private readonly fineDiningOrchestrator: FineDiningOrchestratorService,
  ) {}

  getOrchestrator(
    _receiver: string,
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): Orchestrator {
    const type = restaurant.restaurantType ?? RestaurantType.DEFAULT;

    this.logger.debug(`Creating orchestrator for restaurant type: "${type}"`);

    switch (type) {
      case RestaurantType.FAST_FOOD:
        return this.fastFoodOrchestrator;

      case RestaurantType.FINE_DINING:
        return this.fineDiningOrchestrator;

      case RestaurantType.DEFAULT:
      default:
        return this.defaultOrchestrator;
    }
  }
}
