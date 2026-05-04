import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { RestaurantRepository } from './restaurant.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { CustomerRepository } from '../repositories/customer.repository';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Category.name, schema: CategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [RestaurantRepository, ConversationRepository, CustomerRepository],
  exports: [
    RestaurantRepository,
    ConversationRepository,
    CustomerRepository,
    MongooseModule,
  ],
})
export class DatabaseModule {}
