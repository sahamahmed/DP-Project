import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IBotObserver, BotEvent } from '../bot-observer.interface';
import { BotEventSubject } from '../bot-event.subject';

@Injectable()
export class AnalyticsObserver implements IBotObserver, OnModuleInit {
  private readonly logger = new Logger(AnalyticsObserver.name);

  constructor(private readonly subject: BotEventSubject) {}

  onModuleInit(): void {
    this.subject.registerObserver(this);
  }

  update(event: BotEvent): void {
    switch (event.type) {
      case 'conversation.updated':
        this.logger.log(
          `[Analytics] Conversation updated | restaurant=${event.restaurantId} | status=${event.payload['status']}`,
        );
        break;
      case 'message.customer_received':
        this.logger.log(
          `[Analytics] Customer message | restaurant=${event.restaurantId} | conversation=${event.conversationId}`,
        );
        break;
      case 'message.bot_sent':
        this.logger.log(
          `[Analytics] Bot replied | restaurant=${event.restaurantId} | type=${event.payload['messageType']}`,
        );
        break;
    }
  }
}
