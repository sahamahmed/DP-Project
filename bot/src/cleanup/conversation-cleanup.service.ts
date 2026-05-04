import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from '../database/schemas/conversation.schema';
import { Message } from '../database/schemas/message.schema';
import { Notification } from '../database/schemas/notification.schema';

@Injectable()
export class ConversationCleanupService {
  private readonly logger = new Logger(ConversationCleanupService.name);
  private readonly BATCH_SIZE = 100;
  private readonly NOTIFICATION_RETENTION_DAYS = 7;

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  /**
   * Runs every day at 3 AM PKT (Pakistan Standard Time = UTC+5)
   * 3 AM PKT = 22:00 UTC (previous day)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'conversation-cleanup',
    timeZone: 'Asia/Karachi',
  })
  async handleConversationCleanup(): Promise<void> {
    this.logger.log('Starting conversation cleanup job...');

    const startTime = Date.now();
    let totalConversationsDeleted = 0;
    let totalMessagesDeleted = 0;

    try {
      // Calculate cutoff time (24 hours ago)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Process in batches to avoid memory issues
      let hasMore = true;

      while (hasMore) {
        // Find batch of stale, unsaved conversations
        const staleConversations = await this.conversationModel
          .find({
            isSaved: { $ne: true }, // Not saved (false or undefined)
            lastMessageAt: { $lt: cutoffTime },
          })
          .select('_id')
          .limit(this.BATCH_SIZE)
          .lean();

        if (staleConversations.length === 0) {
          hasMore = false;
          break;
        }

        const conversationIds = staleConversations.map((c) => c._id);

        // Batch delete messages for these conversations
        const messagesResult = await this.messageModel.deleteMany({
          conversationId: { $in: conversationIds },
        });

        totalMessagesDeleted += messagesResult.deletedCount;

        // Batch delete the conversations
        const conversationsResult = await this.conversationModel.deleteMany({
          _id: { $in: conversationIds },
        });

        totalConversationsDeleted += conversationsResult.deletedCount;

        this.logger.log(
          `Batch processed: ${conversationsResult.deletedCount} conversations, ${messagesResult.deletedCount} messages`,
        );

        // If we got fewer than batch size, we're done
        if (staleConversations.length < this.BATCH_SIZE) {
          hasMore = false;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Conversation cleanup completed in ${duration}ms. ` +
          `Deleted ${totalConversationsDeleted} conversations and ${totalMessagesDeleted} messages.`,
      );
    } catch (error) {
      this.logger.error('Conversation cleanup failed:', error);
    }
  }

  /**
   * Runs every day at 3 AM PKT - cleans up read notifications older than 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'notification-cleanup',
    timeZone: 'Asia/Karachi',
  })
  async handleNotificationCleanup(): Promise<void> {
    this.logger.log('Starting notification cleanup job...');

    const startTime = Date.now();

    try {
      // Calculate cutoff time (7 days ago)
      const cutoffTime = new Date(
        Date.now() - this.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      // Delete read notifications older than 7 days
      const result = await this.notificationModel.deleteMany({
        isRead: true,
        createdAt: { $lt: cutoffTime },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Notification cleanup completed in ${duration}ms. ` +
          `Deleted ${result.deletedCount} read notifications older than ${this.NOTIFICATION_RETENTION_DAYS} days.`,
      );
    } catch (error) {
      this.logger.error('Notification cleanup failed:', error);
    }
  }

  /**
   * Manual trigger for testing or on-demand cleanup
   */
  async runCleanupNow(): Promise<{
    conversationsDeleted: number;
    messagesDeleted: number;
    notificationsDeleted: number;
  }> {
    this.logger.log('Manual cleanup triggered');
    await this.handleConversationCleanup();
    await this.handleNotificationCleanup();

    // Return stats (this is a simplified version - actual stats come from the job)
    return {
      conversationsDeleted: 0,
      messagesDeleted: 0,
      notificationsDeleted: 0,
    };
  }
}
