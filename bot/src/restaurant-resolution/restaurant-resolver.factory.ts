import { Injectable } from '@nestjs/common';
import { RestaurantResolver } from '../interfaces/restaurant-resolver.interface';
import { DefaultRestaurantResolver } from './default-restaurant.resolver';

@Injectable()
export class RestaurantResolverFactory {
  constructor(private readonly defaultResolver: DefaultRestaurantResolver) {}

  getResolver(_receiver: string): RestaurantResolver {
    void _receiver;
    // For now, we only have one resolver
    // In the future, you can add specialized resolvers (e.g., franchise chains, premium restaurants)
    return this.defaultResolver;
  }
}
