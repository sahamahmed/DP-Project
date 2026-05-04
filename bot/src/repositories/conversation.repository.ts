import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationStatus,
} from '../database/schemas/conversation.schema';
import {
  Message,
  MessageSender,
  MessageDirection,
  MessageContentType,
} from '../database/schemas/message.schema';

export interface CreateMessageDto {
  sender: MessageSender;
  direction: MessageDirection;
  type: MessageContentType;
  text?: string;
  mediaUrl?: string;
  location?: { latitude: number; longitude: number };
  rawPayload?: Record<string, any>;
}

@Injectable()
export class ConversationRepository {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
  ) {}

  /**
   * Upsert conversation - creates if not exists, updates lastMessageAt
   * Returns the conversation document
   */
  async upsertConversation(
    restaurantId: string,
    customerPhone: string,
    customerName?: string,
  ): Promise<Conversation> {
    const now = new Date();

    const updateData: Record<string, any> = {
      $set: { lastMessageAt: now },
      $inc: { messageCount: 1 },
      $setOnInsert: {
        restaurantId: new Types.ObjectId(restaurantId),
        customerPhone,
        status: ConversationStatus.BOT,
      },
    };

    // Update customerName if provided (always update, not just on insert)
    if (customerName) {
      updateData.$set.customerName = customerName;
    }

    const conversation = await this.conversationModel.findOneAndUpdate(
      {
        restaurantId: new Types.ObjectId(restaurantId),
        customerPhone,
      },
      updateData,
      {
        upsert: true,
        new: true,
      },
    );

    return conversation;
  }

  /**
   * Insert a new message - append only, never update
   */
  async insertMessage(
    conversationId: Types.ObjectId,
    messageData: CreateMessageDto,
  ): Promise<Message> {
    const message = new this.messageModel({
      conversationId,
      ...messageData,
      createdAt: new Date(),
    });

    return await message.save();
  }

  /**
   * Get conversation by restaurantId and customerPhone
   */
  async getConversation(
    restaurantId: string,
    customerPhone: string,
  ): Promise<Conversation | null> {
    return await this.conversationModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        customerPhone,
      })
      .exec();
  }

  /**
   * Update conversation status (for agent takeover, close)
   */
  async updateStatus(
    conversationId: Types.ObjectId,
    status: ConversationStatus,
  ): Promise<Conversation | null> {
    const updateData: Record<string, any> = { status };

    if (status === ConversationStatus.AGENT) {
      updateData.agentAssignedAt = new Date();
    } else if (status === ConversationStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    return await this.conversationModel
      .findByIdAndUpdate(conversationId, { $set: updateData }, { new: true })
      .exec();
  }

  /**
   * Get messages for a conversation (for agent UI / history)
   */
  async getMessages(
    conversationId: Types.ObjectId,
    limit = 50,
    before?: Date,
  ): Promise<Message[]> {
    const query: Record<string, any> = { conversationId };

    if (before) {
      query.createdAt = { $lt: before };
    }

    return await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get active conversations for a restaurant (for dashboard)
   */
  async getActiveConversations(
    restaurantId: string,
    status?: ConversationStatus,
    limit = 50,
  ): Promise<Conversation[]> {
    const query: Record<string, any> = {
      restaurantId: new Types.ObjectId(restaurantId),
    };

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: ConversationStatus.CLOSED };
    }

    return await this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Toggle saved status for a conversation
   * Saved conversations are not deleted by the cleanup job
   */
  async toggleSaved(
    conversationId: Types.ObjectId,
    isSaved: boolean,
  ): Promise<Conversation | null> {
    return await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { isSaved } },
      { new: true },
    );
  }
}
