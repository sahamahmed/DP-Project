import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../database/schemas/customer.schema';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { CustomerController } from './customer.controller';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema }, // For order stats aggregation
    ]),
    AuthModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerRepository],
  exports: [CustomerRepository],
})
export class CustomerModule {}
