import {
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get notifications for the restaurant
   */
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const restaurantId = req.user.restaurantId;
    const notifications = await this.notificationService.getNotifications(
      restaurantId,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );

    return notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  /**
   * Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const restaurantId = req.user.restaurantId;
    const count = await this.notificationService.getUnreadCount(restaurantId);
    return { count };
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationService.markAsRead(id);
    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }
    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const restaurantId = req.user.restaurantId;
    await this.notificationService.markAllAsRead(restaurantId);
    return { success: true };
  }
}
