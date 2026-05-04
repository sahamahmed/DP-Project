import { Injectable } from '@nestjs/common';
import { RestaurantResolver } from '../interfaces/restaurant-resolver.interface';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { HydratedDocument } from 'mongoose';
import { RestaurantRepository } from 'src/database/restaurant.repository';
import { SessionStoreService } from '../session-store/session-store.service';

@Injectable()
export class DefaultRestaurantResolver implements RestaurantResolver {
  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly sessionStore: SessionStoreService,
  ) {}

  canResolve(_receiver: string): boolean {
    void _receiver;
    // Default resolver handles all restaurants
    return true;
  }

  async resolveRestaurant(
    receiver: string,
  ): Promise<Restaurant | HydratedDocument<Restaurant> | null> {
    // First check cache
    const cached = await this.sessionStore.getCachedRestaurant(receiver);
    if (cached) {
      return cached;
    }

    // Query database
    const restaurant =
      await this.restaurantRepository.findByWhatsappNumber(receiver);

    if (restaurant) {
      // Cache for future requests
      await this.sessionStore.cacheRestaurant(receiver, restaurant);
    }

    return restaurant;
  }
}
