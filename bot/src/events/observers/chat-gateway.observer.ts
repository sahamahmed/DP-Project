import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IBotObserver, BotEvent } from '../bot-observer.interface';
import { BotEventSubject } from '../bot-event.subject';
import { ChatGateway } from '../../gateways/chat.gateway';

@Injectable()
export class ChatGatewayObserver implements IBotObserver, OnModuleInit {
  private readonly logger = new Logger(ChatGatewayObserver.name);

  constructor(
    private readonly subject: BotEventSubject,
    private readonly chatGateway: ChatGateway,
  ) {}

  onModuleInit(): void {
    this.subject.registerObserver(this);
  }

  update(event: BotEvent): void {
    switch (event.type) {
      case 'conversation.updated':
        this.chatGateway.emitConversationUpdate(event.restaurantId, {
          id: event.conversationId,
          customerPhone: event.payload['customerPhone'],
          customerName: event.payload['customerName'],
          status: event.payload['status'],
          lastMessage: event.payload['lastMessage'],
          updatedAt: event.payload['updatedAt'],
          messageFrom: event.payload['messageFrom'],
        });
        break;

      case 'message.customer_received':
        this.chatGateway.emitNewCustomerMessage(event.restaurantId, {
          conversationId: event.conversationId,
          customerId: event.payload['customerId'],
          customerPhone: event.payload['customerPhone'],
          customerName: event.payload['customerName'],
          message: {
            id: event.payload['messageId'],
            content: event.payload['content'],
            sender: 'customer',
            type: event.payload['messageType'],
            timestamp: event.payload['timestamp'],
          },
        });
        break;

      case 'message.bot_sent':
        this.chatGateway.emitBotMessage(
          event.restaurantId,
          event.conversationId,
          {
            id: event.payload['messageId'],
            content: event.payload['content'],
            type: event.payload['messageType'],
            timestamp: event.payload['timestamp'],
          },
        );
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }
}
