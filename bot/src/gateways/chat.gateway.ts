import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, Injectable } from '@nestjs/common';
import { ConversationRepository } from '../repositories/conversation.repository';
import { ConversationStatus } from '../database/schemas/conversation.schema';
import {
  MessageSender,
  MessageDirection,
  MessageContentType,
} from '../database/schemas/message.schema';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../whatsapp/whatsapp-service.interface';
import { RestaurantRepository } from '../database/restaurant.repository';
import { SessionStoreService } from '../session-store/session-store.service';
import { Types } from 'mongoose';
import { RETURNED_TO_BOT_PROMPT } from '../constants/menu-templates';
import { toErrorMessage } from '../utils/error.utils';

export interface JoinRoomDto {
  restaurantId: string;
}

export interface SendAgentMessageDto {
  conversationId: string;
  customerPhone: string;
  restaurantId: string;
  restaurantPhone: string;
  text: string;
}

export interface TakeOverDto {
  conversationId: string;
  customerPhone: string;
  restaurantId: string;
  restaurantPhone: string;
}

export interface CloseConversationDto {
  conversationId: string;
  customerPhone: string;
  restaurantId: string;
  restaurantPhone: string;
}

export interface NewMessagePayload {
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  message: {
    id: string;
    content: string;
    sender: 'customer' | 'bot' | 'agent';
    type: string;
    timestamp: Date;
    mediaUrl?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/chat',
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly restaurantRepository: RestaurantRepository,
    @Inject(IWHATSAPP_SERVICE)
    private readonly whatsappService: IWhatsappService,
    private readonly sessionStore: SessionStoreService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Admin joins a restaurant room to receive events for that restaurant
   */
  @SubscribeMessage('join:restaurant')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const roomName = `restaurant:${data.restaurantId}`;
    await client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);

    return { success: true, room: roomName };
  }

  /**
   * Admin leaves a restaurant room
   */
  @SubscribeMessage('leave:restaurant')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const roomName = `restaurant:${data.restaurantId}`;
    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);

    return { success: true };
  }

  /**
   * Agent takes over a conversation - sets agentMode = true
   */
  @SubscribeMessage('conversation:takeover')
  async handleTakeOver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TakeOverDto,
  ) {
    try {
      // Update conversation status in DB
      await this.conversationRepository.updateStatus(
        new Types.ObjectId(data.conversationId),
        ConversationStatus.AGENT,
      );

      // Update session to set agentMode = true
      const restaurant = await this.restaurantRepository.findById(
        data.restaurantId,
      );
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      await this.sessionStore.updateConversationState(
        data.customerPhone,
        restaurant.phoneNumberId,
        { agentMode: true },
      );

      // Notify all admins in the restaurant room
      this.server
        .to(`restaurant:${data.restaurantId}`)
        .emit('conversation:taken-over', {
          conversationId: data.conversationId,
          status: 'agent',
        });

      this.logger.log(
        `Conversation ${data.conversationId} taken over by agent`,
      );
      return { success: true };
    } catch (error) {
      const msg = toErrorMessage(error);
      this.logger.error(`Failed to takeover conversation: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Agent closes a conversation - returns to bot mode
   */
  @SubscribeMessage('conversation:close')
  async handleCloseConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CloseConversationDto,
  ) {
    try {
      this.logger.log(
        `Closing conversation: ${data.conversationId}, customerPhone: ${data.customerPhone}, restaurantId: ${data.restaurantId}`,
      );

      // Update conversation status in DB
      await this.conversationRepository.updateStatus(
        new Types.ObjectId(data.conversationId),
        ConversationStatus.BOT,
      );

      // Update session to set agentMode = false and dialogEnded = true
      const restaurant = await this.restaurantRepository.findById(
        data.restaurantId,
      );
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      this.logger.log(
        `Found restaurant phoneNumberId: ${restaurant.phoneNumberId}`,
      );

      await this.sessionStore.updateConversationState(
        data.customerPhone,
        restaurant.phoneNumberId,
        { agentMode: false, dialogEnded: true },
      );

      // Send "returned to bot" message with menu options via WhatsApp
      await this.whatsappService.sendButtonMessage(
        data.customerPhone,
        RETURNED_TO_BOT_PROMPT.headerText || '',
        RETURNED_TO_BOT_PROMPT.bodyText || '',
        RETURNED_TO_BOT_PROMPT.buttons || [],
        {
          phoneNumberId: restaurant.phoneNumberId,
          accessToken: restaurant.accessToken,
        },
      );

      // Notify all admins
      this.server
        .to(`restaurant:${data.restaurantId}`)
        .emit('conversation:closed', {
          conversationId: data.conversationId,
          status: 'bot',
        });

      this.logger.log(
        `Conversation ${data.conversationId} closed, returning to bot`,
      );
      return { success: true };
    } catch (error) {
      const msg = toErrorMessage(error);
      this.logger.error(`Failed to close conversation: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Agent sends a message to customer via WhatsApp
   */
  @SubscribeMessage('message:send')
  async handleAgentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendAgentMessageDto,
  ) {
    try {
      // Get restaurant for credentials
      const restaurant = await this.restaurantRepository.findById(
        data.restaurantId,
      );
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const credentials = {
        phoneNumberId: restaurant.phoneNumberId,
        accessToken: restaurant.accessToken,
      };

      // Send message via WhatsApp
      await this.whatsappService.sendTextMessage(
        data.customerPhone,
        data.text,
        credentials,
      );

      // Store message in DB
      const message = await this.conversationRepository.insertMessage(
        new Types.ObjectId(data.conversationId),
        {
          sender: MessageSender.AGENT,
          direction: MessageDirection.OUTBOUND,
          type: MessageContentType.TEXT,
          text: data.text,
        },
      );

      // Emit to all connected admins in the room
      const messagePayload = {
        conversationId: data.conversationId,
        message: {
          id: message._id.toString(),
          content: data.text,
          sender: 'agent',
          type: 'text',
          timestamp: message.createdAt,
        },
      };

      this.server
        .to(`restaurant:${data.restaurantId}`)
        .emit('message:new', messagePayload);

      this.logger.log(`Agent message sent to ${data.customerPhone}`);
      return { success: true, messageId: message._id.toString() };
    } catch (error) {
      const msg = toErrorMessage(error);
      this.logger.error(`Failed to send agent message: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Emits a new customer message to all connected admins for that restaurant
   * Called from BotService when a message arrives in agent mode
   */
  emitNewCustomerMessage(restaurantId: string, payload: NewMessagePayload) {
    const roomName = `restaurant:${restaurantId}`;
    this.server.to(roomName).emit('message:new', payload);
    this.logger.log(`Emitted new customer message to room ${roomName}`);
  }

  /**
   * Emits bot message to admin panel
   */
  emitBotMessage(
    restaurantId: string,
    conversationId: string,
    message: {
      id: string;
      content: string;
      type: string;
      timestamp: Date;
    },
  ) {
    const roomName = `restaurant:${restaurantId}`;
    this.server.to(roomName).emit('message:new', {
      conversationId,
      message: {
        ...message,
        sender: 'bot',
      },
    });
    this.logger.log(`Emitted bot message to room ${roomName}`);
  }

  /**
   * Emits conversation update (e.g., new conversation started)
   */
  emitConversationUpdate(
    restaurantId: string,
    conversation: {
      id: string;
      customerPhone: string;
      customerName: string;
      status: string;
      lastMessage: string;
      updatedAt: Date;
      messageFrom?: 'customer' | 'bot' | 'agent';
    },
  ) {
    const roomName = `restaurant:${restaurantId}`;
    this.server.to(roomName).emit('conversation:update', conversation);
    this.logger.log(`Emitted conversation update to room ${roomName}`);
  }

  /**
   * Generic method to emit any event to a restaurant room
   */
  emitToRestaurant(
    restaurantId: string,
    event: string,
    payload: Record<string, any>,
  ) {
    const roomName = `restaurant:${restaurantId}`;
    this.server.to(roomName).emit(event, payload);
    this.logger.log(`Emitted ${event} to room ${roomName}`);
  }
}
