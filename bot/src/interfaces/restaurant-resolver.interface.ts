import { Restaurant } from '../database/schemas/restaurant.schema';
import { HydratedDocument } from 'mongoose';

export interface RestaurantResolver {
  canResolve(receiver: string): boolean;
  resolveRestaurant(
    receiver: string,
  ): Promise<Restaurant | HydratedDocument<Restaurant> | null>;
}
