import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { CartController } from './cart.controller';
import { BotService } from '../bot.service';
import { MessageDispatcherService } from '../message-dispatcher/message-dispatcher.service';
import { RestaurantResolverFactory } from '../restaurant-resolution/restaurant-resolver.factory';
import { DefaultRestaurantResolver } from '../restaurant-resolution/default-restaurant.resolver';
import { OrchestratorFactory } from '../orchestrators/orchestrator.factory';
import { RestaurantOrchestratorService } from '../orchestrators/restaurant-orchestrator.service';
import { FastFoodOrchestratorService } from '../orchestrators/fast-food-orchestrator.service';
import { FineDiningOrchestratorService } from '../orchestrators/fine-dining-orchestrator.service';
import { MenuHandlerService } from '../handlers/menu.handler';
import { CartHandlerService } from '../handlers/cart.handler';
import { CheckoutHandlerService } from '../handlers/checkout.handler';
import { TrackingHandlerService } from '../handlers/tracking.handler';
import { DatabaseModule } from '../database/database.module';
import { SessionStoreModule } from '../session-store/session-store.module';
import { MenuRepository } from '../repositories/menu.repository';
import { GroqQueueModule } from '../groq-queue/groq-queue.module';
import { QuantityParser } from '../utils/quantity-parser';
import { ChatModule } from '../gateways/chat.module';
import { AdminModule } from '../admin/admin.module';
import { BotPipelineModule } from '../bot-pipeline/bot-pipeline.module';
import { RetryWhatsappDecorator } from './decorators/retry-whatsapp.decorator';
import { IWHATSAPP_SERVICE } from './whatsapp-service.interface';

@Module({
  imports: [
    DatabaseModule,
    SessionStoreModule,
    GroqQueueModule,
    forwardRef(() => ChatModule),
    AdminModule,
    forwardRef(() => BotPipelineModule),
  ],
  controllers: [WebhookController, CartController],
  providers: [
    // The real WhatsappService (Concrete Component — not injected directly by callers)
    WhatsappService,

    /**
     * DECORATOR PATTERN — Step 4 wiring
     *
     * We bind IWHATSAPP_SERVICE token to a factory that wraps WhatsappService
     * inside RetryWhatsappDecorator. All callers inject IWHATSAPP_SERVICE and
     * receive the decorated version transparently.
     *
     * To stack another decorator (e.g. RateLimitDecorator):
     *   useFactory: (svc) => new RateLimitDecorator(new RetryWhatsappDecorator(svc))
     *   — only this provider changes, nothing else.
     */
    {
      provide: IWHATSAPP_SERVICE,
      useFactory: (whatsappService: WhatsappService) =>
        new RetryWhatsappDecorator(whatsappService),
      inject: [WhatsappService],
    },

    BotService,
    MessageDispatcherService,
    // Restaurant Resolution
    RestaurantResolverFactory,
    DefaultRestaurantResolver,
    // Orchestrators — Factory + concrete products (Pattern 3: Factory Method)
    OrchestratorFactory,
    RestaurantOrchestratorService,
    FastFoodOrchestratorService,
    FineDiningOrchestratorService,
    // Repositories
    MenuRepository,
    // Utils
    QuantityParser,
    // Dialog Handlers
    MenuHandlerService,
    CartHandlerService,
    CheckoutHandlerService,
    TrackingHandlerService,
  ],
  exports: [WhatsappService, IWHATSAPP_SERVICE],
})
export class WhatsappModule {}
