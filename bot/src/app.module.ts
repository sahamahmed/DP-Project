import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { SessionStoreModule } from './session-store/session-store.module';
import { GroqQueueModule } from './groq-queue/groq-queue.module';
import { ChatModule } from './gateways/chat.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './orders/order.module';
import { CustomerModule } from './customers/customer.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    DatabaseModule,
    SessionStoreModule,
    GroqQueueModule,
    WhatsappModule,
    ChatModule,
    AuthModule,
    AdminModule,
    MenuModule,
    OrderModule,
    CustomerModule,
    CleanupModule,
    HealthModule,
  ],
})
export class AppModule {}
