import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Flexible notification types for future expansion
export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  AGENT_REQUEST = 'agent_request',
  LOW_STOCK = 'low_stock',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  // Flexible metadata for different notification types
  @Prop({ type: Object })
  metadata?: {
    orderId?: string;
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    amount?: number;
    source?: string;
    [key: string]: any;
  };

  // Timestamps added by mongoose
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for fetching notifications by restaurant
NotificationSchema.index({ restaurantId: 1, createdAt: -1 });

// Index for unread count
NotificationSchema.index({ restaurantId: 1, isRead: 1 });
