import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MessageSender {
  USER = 'USER',
  BOT = 'BOT',
  AGENT = 'AGENT',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageContentType {
  TEXT = 'text',
  BUTTON = 'button',
  LIST = 'list',
  LOCATION = 'location',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
}

@Schema({ timestamps: false })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, enum: MessageSender, required: true })
  sender: MessageSender;

  @Prop({ type: String, enum: MessageDirection, required: true })
  direction: MessageDirection;

  @Prop({
    type: String,
    enum: MessageContentType,
    default: MessageContentType.TEXT,
  })
  type: MessageContentType;

  @Prop()
  text?: string;

  @Prop()
  mediaUrl?: string;

  @Prop({ type: Object })
  location?: {
    latitude: number;
    longitude: number;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Object })
  rawPayload?: Record<string, any>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Index for fetching conversation messages
MessageSchema.index({ conversationId: 1, createdAt: 1 });

// Index for audit/search
MessageSchema.index({ conversationId: 1, sender: 1 });
