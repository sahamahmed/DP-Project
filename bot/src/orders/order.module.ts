import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { OrderController } from './order.controller';
import { OrderRepository } from '../repositories/order.repository';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../gateways/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    AuthModule,
    ChatModule,
  ],
  controllers: [OrderController],
  providers: [OrderRepository],
  exports: [OrderRepository],
})
export class OrderModule {}
