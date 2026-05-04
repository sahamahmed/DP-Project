import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { NotificationController } from './notification.controller';
import { DatabaseModule } from '../database/database.module';
import { SessionStoreModule } from '../session-store/session-store.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { BotEventSubject } from '../events/bot-event.subject';
import { ChatGatewayObserver } from '../events/observers/chat-gateway.observer';
import { AnalyticsObserver } from '../events/observers/analytics.observer';

/**
 * OBSERVER PATTERN — wiring
 *
 * BotEventSubject (Concrete Subject) is provided here and exported so
 * BotService can inject it and call notifyObservers().
 *
 * ChatGatewayObserver and AnalyticsObserver (Concrete Observers) are
 * registered here. Each calls subject.registerObserver(this) on init —
 * equivalent to: stock.registerObserver(new MobileDisplay())
 */
@Module({
  imports: [
    DatabaseModule,
    SessionStoreModule,
    forwardRef(() => WhatsappModule),
  ],
  controllers: [ChatController, NotificationController],
  providers: [
    ChatGateway,
    NotificationRepository,
    NotificationService,
    BotEventSubject,
    ChatGatewayObserver,
    AnalyticsObserver,
  ],
  exports: [ChatGateway, NotificationService, BotEventSubject],
})
export class ChatModule {}
