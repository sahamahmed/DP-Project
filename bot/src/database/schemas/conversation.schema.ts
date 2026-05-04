import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ConversationStatus {
  BOT = 'BOT',
  AGENT = 'AGENT',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true })
  customerPhone: string;

  @Prop()
  customerName?: string;

  @Prop({
    type: String,
    enum: ConversationStatus,
    default: ConversationStatus.BOT,
  })
  status: ConversationStatus;

  @Prop({ type: Date, default: Date.now })
  lastMessageAt: Date;

  @Prop({ type: Date })
  agentAssignedAt?: Date;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({ type: Boolean, default: false })
  isSaved: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Unique compound index - one conversation per restaurant+customer pair
ConversationSchema.index(
  { restaurantId: 1, customerPhone: 1 },
  { unique: true },
);

// Index for dashboard queries
ConversationSchema.index({ restaurantId: 1, status: 1, lastMessageAt: -1 });

// Index for cleanup job - find stale unsaved conversations
ConversationSchema.index({ isSaved: 1, lastMessageAt: 1 });
