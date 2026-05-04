import { Injectable, Logger } from '@nestjs/common';
import { ChatGateway } from '../gateways/chat.gateway';
import { toErrorMessage, toErrorStack } from '../utils/error.utils';
import {
  NotificationRepository,
  CreateNotificationDto,
} from '../repositories/notification.repository';
import {
  Notification,
  NotificationType,
} from '../database/schemas/notification.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Create a notification and emit to frontend via WebSocket
   * Non-blocking - errors are logged but don't throw
   */
  async createNotification(data: CreateNotificationDto): Promise<void> {
    try {
      const notification = await this.notificationRepository.create(data);

      // Emit to frontend via WebSocket
      this.chatGateway.emitToRestaurant(data.restaurantId, 'notification:new', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      this.logger.log(
        `Notification created: ${notification.type} for restaurant ${data.restaurantId}`,
      );
    } catch (error) {
      // Non-blocking - just log the error
      this.logger.error(
        `Failed to create notification: ${toErrorMessage(error)}`,
        toErrorStack(error),
      );
    }
  }

  /**
   * Create order notification helper
   */
  async notifyOrderCreated(
    restaurantId: string,
    orderNumber: string,
    customerName: string,
    amount: number,
    source: 'bot' | 'agent',
  ): Promise<void> {
    await this.createNotification({
      restaurantId,
      type: NotificationType.ORDER_CREATED,
      title: 'New Order',
      message: `Order #${orderNumber} from ${customerName} - Rs. ${amount.toLocaleString()}`,
      metadata: {
        orderNumber,
        customerName,
        amount,
        source,
      },
    });
  }

  /**
   * Create order status change notification
   */
  async notifyOrderStatusChanged(
    restaurantId: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    await this.createNotification({
      restaurantId,
      type: NotificationType.ORDER_STATUS_CHANGED,
      title: 'Order Status Updated',
      message: `Order #${orderNumber} is now ${status}`,
      metadata: {
        orderNumber,
        status,
      },
    });
  }

  /**
   * Create agent request notification (when customer requests live agent)
   */
  async notifyAgentRequest(
    restaurantId: string,
    customerName: string,
    customerPhone: string,
  ): Promise<void> {
    await this.createNotification({
      restaurantId,
      type: NotificationType.AGENT_REQUEST,
      title: 'Agent Request',
      message: `${customerName} is requesting to speak with an agent`,
      metadata: {
        customerName,
        customerPhone,
      },
    });
  }

  /**
   * Get notifications for a restaurant
   */
  async getNotifications(
    restaurantId: string,
    limit = 50,
    skip = 0,
  ): Promise<Notification[]> {
    return await this.notificationRepository.getByRestaurant(
      restaurantId,
      limit,
      skip,
    );
  }

  /**
   * Get unread count
   */
  async getUnreadCount(restaurantId: string): Promise<number> {
    return await this.notificationRepository.getUnreadCount(restaurantId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    return await this.notificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(restaurantId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(restaurantId);
  }
}
