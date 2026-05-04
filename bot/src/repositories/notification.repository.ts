import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationType,
} from '../database/schemas/notification.schema';

export interface CreateNotificationDto {
  restaurantId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  /**
   * Create a new notification
   */
  async create(data: CreateNotificationDto): Promise<Notification> {
    const notification = new this.notificationModel({
      restaurantId: new Types.ObjectId(data.restaurantId),
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      isRead: false,
    });

    return await notification.save();
  }

  /**
   * Get notifications for a restaurant (paginated, newest first)
   */
  async getByRestaurant(
    restaurantId: string,
    limit = 50,
    skip = 0,
  ): Promise<Notification[]> {
    return await this.notificationModel
      .find({ restaurantId: new Types.ObjectId(restaurantId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Get unread count for a restaurant
   */
  async getUnreadCount(restaurantId: string): Promise<number> {
    return await this.notificationModel.countDocuments({
      restaurantId: new Types.ObjectId(restaurantId),
      isRead: false,
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    return await this.notificationModel
      .findByIdAndUpdate(notificationId, { isRead: true }, { new: true })
      .exec();
  }

  /**
   * Mark all notifications as read for a restaurant
   */
  async markAllAsRead(restaurantId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { restaurantId: new Types.ObjectId(restaurantId), isRead: false },
      { isRead: true },
    );
  }
}
