import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationCleanupService } from './conversation-cleanup.service';
import {
  Conversation,
  ConversationSchema,
} from '../database/schemas/conversation.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import {
  Notification,
  NotificationSchema,
} from '../database/schemas/notification.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [ConversationCleanupService],
  exports: [ConversationCleanupService],
})
export class CleanupModule {}
