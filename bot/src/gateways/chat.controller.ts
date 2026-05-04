/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConversationRepository } from '../repositories/conversation.repository';
import { ConversationStatus } from '../database/schemas/conversation.schema';
import { RestaurantRepository } from '../database/restaurant.repository';
import { SessionStoreService } from '../session-store/session-store.service';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../whatsapp/whatsapp-service.interface';
import {
  MessageSender,
  MessageDirection,
  MessageContentType,
} from '../database/schemas/message.schema';
import { Types } from 'mongoose';
import { RETURNED_TO_BOT_PROMPT } from '../constants/menu-templates';
import { toErrorMessage } from '../utils/error.utils';

interface SendMessageDto {
  text: string;
  customerPhone: string;
}

interface UpdateStatusDto {
  status: 'agent' | 'bot' | 'closed';
  customerPhone: string;
}

interface ToggleSavedDto {
  isSaved: boolean;
}

@Controller('api/restaurants/:restaurantId/chats')
export class ChatController {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly restaurantRepository: RestaurantRepository,
    private readonly sessionStore: SessionStoreService,
    @Inject(IWHATSAPP_SERVICE) private readonly whatsappService: IWhatsappService,
  ) {}

  /**
   * Get all conversations for a restaurant
   */
  @Get()
  async getConversations(
    @Param('restaurantId') restaurantId: string,
    @Query('status') status?: string,
  ) {
    try {
      let conversationStatus: ConversationStatus | undefined;
      if (status) {
        conversationStatus = status.toUpperCase() as ConversationStatus;
      }

      const conversations =
        await this.conversationRepository.getActiveConversations(
          restaurantId,
          conversationStatus,
        );

      // Map to frontend-friendly format
      return conversations.map((conv) => ({
        id: conv._id.toString(),
        customerPhone: conv.customerPhone,
        customerName: conv.customerName || conv.customerPhone,
        status: conv.status.toLowerCase(),
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
        agentAssignedAt: conv.agentAssignedAt,
        closedAt: conv.closedAt,
        isSaved: conv.isSaved || false,
        createdAt: (conv as any).createdAt,
        updatedAt: (conv as any).updatedAt,
      }));
    } catch (error) {
      throw new HttpException(
        `Failed to fetch conversations: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get messages for a conversation
   */
  @Get(':conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const beforeDate = before ? new Date(before) : undefined;

      const messages = await this.conversationRepository.getMessages(
        new Types.ObjectId(conversationId),
        limitNum,
        beforeDate,
      );

      // Map to frontend-friendly format and reverse for chronological order
      return messages
        .map((msg) => ({
          id: msg._id.toString(),
          content: msg.text || '',
          sender: msg.sender === 'USER' ? 'customer' : msg.sender.toLowerCase(),
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          location: msg.location,
          timestamp: msg.createdAt,
        }))
        .reverse();
    } catch (error) {
      throw new HttpException(
        `Failed to fetch messages: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send a message as agent
   */
  @Post(':conversationId/messages')
  async sendMessage(
    @Param('restaurantId') restaurantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageDto,
  ) {
    try {
      // Get restaurant for credentials
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (!restaurant) {
        throw new HttpException('Restaurant not found', HttpStatus.NOT_FOUND);
      }

      const credentials = {
        phoneNumberId: restaurant.phoneNumberId,
        accessToken: restaurant.accessToken,
      };

      // Send message via WhatsApp
      await this.whatsappService.sendTextMessage(
        body.customerPhone,
        body.text,
        credentials,
      );

      // Store message in DB
      const message = await this.conversationRepository.insertMessage(
        new Types.ObjectId(conversationId),
        {
          sender: MessageSender.AGENT,
          direction: MessageDirection.OUTBOUND,
          type: MessageContentType.TEXT,
          text: body.text,
        },
      );

      return {
        id: message._id.toString(),
        content: body.text,
        sender: 'agent',
        type: 'text',
        timestamp: message.createdAt,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to send message: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update conversation status (takeover / close)
   */
  @Post(':conversationId/status')
  async updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: UpdateStatusDto,
  ) {
    try {
      let status: ConversationStatus;
      let agentMode: boolean;

      switch (body.status) {
        case 'agent':
          status = ConversationStatus.AGENT;
          agentMode = true;
          break;
        case 'bot':
          status = ConversationStatus.BOT;
          agentMode = false;
          break;
        case 'closed':
          status = ConversationStatus.CLOSED;
          agentMode = false;
          break;
        default:
          throw new HttpException('Invalid status', HttpStatus.BAD_REQUEST);
      }

      // Update conversation in DB
      const conversation = await this.conversationRepository.updateStatus(
        new Types.ObjectId(conversationId),
        status,
      );

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      // Update session
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (restaurant) {
        // When returning to bot, also set dialogEnded to true so menu options appear
        const sessionUpdate =
          body.status === 'bot'
            ? { agentMode, dialogEnded: true }
            : { agentMode };

        await this.sessionStore.updateConversationState(
          body.customerPhone,
          restaurant.phoneNumberId,
          sessionUpdate,
        );

        // Send "returned to bot" WhatsApp message with menu options
        if (body.status === 'bot') {
          await this.whatsappService.sendButtonMessage(
            body.customerPhone,
            RETURNED_TO_BOT_PROMPT.headerText || '',
            RETURNED_TO_BOT_PROMPT.bodyText || '',
            RETURNED_TO_BOT_PROMPT.buttons || [],
            {
              phoneNumberId: restaurant.phoneNumberId,
              accessToken: restaurant.accessToken,
            },
          );
        }
      }

      return {
        id: conversation._id.toString(),
        status: conversation.status.toLowerCase(),
        agentAssignedAt: conversation.agentAssignedAt,
        closedAt: conversation.closedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update status: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single conversation by ID
   */
  @Get(':conversationId')
  async getConversation(@Param('conversationId') conversationId: string) {
    try {
      // Use the repository - we need to add a method for this
      const messages = await this.conversationRepository.getMessages(
        new Types.ObjectId(conversationId),
        1,
      );

      if (!messages.length) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      // Get conversation details from first message's conversation ref
      // For now, return a basic response
      return {
        id: conversationId,
        messages: messages.map((msg) => ({
          id: msg._id.toString(),
          content: msg.text || '',
          sender: msg.sender.toLowerCase(),
          type: msg.type,
          timestamp: msg.createdAt,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch conversation: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Toggle saved status for a conversation
   * Saved conversations are not deleted by the cleanup job
   */
  @Patch(':conversationId/saved')
  async toggleSaved(
    @Param('conversationId') conversationId: string,
    @Body() body: ToggleSavedDto,
  ) {
    try {
      if (!Types.ObjectId.isValid(conversationId)) {
        throw new HttpException(
          'Invalid conversation ID',
          HttpStatus.BAD_REQUEST,
        );
      }

      const conversation = await this.conversationRepository.toggleSaved(
        new Types.ObjectId(conversationId),
        body.isSaved,
      );

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: conversation._id.toString(),
        isSaved: conversation.isSaved,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update saved status: ${toErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
