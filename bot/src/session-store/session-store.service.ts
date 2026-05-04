import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  ConversationState,
  UserSession,
} from '../interfaces/session.interface';
import { Restaurant } from '../database/schemas/restaurant.schema';

@Injectable()
export class SessionStoreService {
  private readonly logger = new Logger(SessionStoreService.name);
  private readonly SESSION_TTL = 86400; // 24 hours
  private readonly LOCK_TTL = 10; // 10 seconds

  constructor(private redisService: RedisService) {}

  private getUserSessionKey(userId: string, restaurantPhone: string): string {
    return `session:${restaurantPhone}:${userId}`;
  }

  private getUserLockKey(userId: string): string {
    return `lock:${userId}`;
  }

  async getUserSession(
    userId: string,
    restaurantPhone: string,
  ): Promise<UserSession | null> {
    const key = this.getUserSessionKey(userId, restaurantPhone);
    const data = await this.redisService.get(key);
    return data ? (JSON.parse(data) as UserSession) : null;
  }

  async setUserSession(
    userId: string,
    restaurantPhone: string,
    session: UserSession,
  ): Promise<void> {
    const key = this.getUserSessionKey(userId, restaurantPhone);
    await this.redisService.set(key, JSON.stringify(session), this.SESSION_TTL);
  }

  async deleteUserSession(
    userId: string,
    restaurantPhone: string,
  ): Promise<void> {
    const key = this.getUserSessionKey(userId, restaurantPhone);
    await this.redisService.del(key);
  }

  async acquireUserLock(userId: string): Promise<boolean> {
    const lockKey = this.getUserLockKey(userId);
    const client = this.redisService.getClient();
    const result = await client.set(lockKey, '1', 'EX', this.LOCK_TTL, 'NX');
    return result === 'OK';
  }

  async releaseUserLock(userId: string): Promise<void> {
    const lockKey = this.getUserLockKey(userId);
    await this.redisService.del(lockKey);
  }

  async cacheRestaurant(
    restaurantPhone: string,
    restaurantData: Restaurant | Record<string, unknown>,
  ): Promise<void> {
    const key = `restaurant:${restaurantPhone}`;
    await this.redisService.set(key, JSON.stringify(restaurantData), 3600); // 1 hour cache
  }

  async getCachedRestaurant(
    restaurantPhone: string,
  ): Promise<Restaurant | null> {
    const key = `restaurant:${restaurantPhone}`;
    const data = await this.redisService.get(key);
    return data ? (JSON.parse(data) as Restaurant) : null;
  }

  /**
   * Invalidate restaurant cache by phone number
   * Call this when restaurant details are updated (hours, name, image, menu, etc.)
   */
  async invalidateRestaurantCache(restaurantPhone: string): Promise<void> {
    const key = `restaurant:${restaurantPhone}`;
    await this.redisService.del(key);
    this.logger.log(`Invalidated restaurant cache for: ${restaurantPhone}`);
  }

  /**
   * Update conversation state for a user session
   * Used by ChatGateway to set agentMode
   */
  async updateConversationState(
    userId: string,
    restaurantPhone: string,
    conversationState: Partial<ConversationState>,
  ): Promise<void> {
    const key = this.getUserSessionKey(userId, restaurantPhone);
    this.logger.log(
      `Updating conversation state for key: ${key}, update: ${JSON.stringify(conversationState)}`,
    );

    const session = await this.getUserSession(userId, restaurantPhone);
    if (session) {
      session.conversationState = {
        ...session.conversationState,
        ...conversationState,
      };
      await this.setUserSession(userId, restaurantPhone, session);
      this.logger.log(
        `Session updated successfully. New state: ${JSON.stringify(session.conversationState)}`,
      );
    } else {
      this.logger.warn(
        `Session not found for userId: ${userId}, restaurantPhone: ${restaurantPhone}`,
      );
    }
  }
}
