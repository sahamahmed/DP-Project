import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerRepository } from '../repositories/customer.repository';
import { Order } from '../database/schemas/order.schema';

interface CustomerWithStats {
  id: string;
  phone: string;
  name: string;
  isBlocked: boolean;
  createdAt: Date;
  totalOrders: number;
  totalSpend: number;
}

interface UpdateCustomerDto {
  isBlocked?: boolean;
  name?: string;
}

@Controller('api/customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  @Get()
  async getCustomers(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('search') search?: string,
  ): Promise<{ customers: CustomerWithStats[]; total: number }> {
    const restaurantId = req.user.restaurantId;

    // Get paginated customers
    const { customers, total } = await this.customerRepository.findByRestaurant(
      restaurantId,
      {
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
        search,
      },
    );

    if (customers.length === 0) {
      return { customers: [], total: 0 };
    }

    // Get phone numbers for aggregation
    const phoneNumbers = customers.map((c) => c.phone);

    // Aggregate order stats for these customers in a single query
    const orderStats = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          customerPhone: { $in: phoneNumbers },
          status: { $nin: ['cancelled'] }, // Exclude cancelled orders
        },
      },
      {
        $group: {
          _id: '$customerPhone',
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: '$total' },
        },
      },
    ]);

    // Create a map for quick lookup
    const statsMap = new Map<
      string,
      { totalOrders: number; totalSpend: number }
    >();
    for (const stat of orderStats) {
      statsMap.set(stat._id, {
        totalOrders: stat.totalOrders,
        totalSpend: stat.totalSpend,
      });
    }

    // Merge customer data with stats
    const customersWithStats: CustomerWithStats[] = customers.map(
      (customer) => {
        const stats = statsMap.get(customer.phone) || {
          totalOrders: 0,
          totalSpend: 0,
        };
        return {
          id: customer._id.toString(),
          phone: customer.phone,
          name: customer.name || '',
          isBlocked: customer.isBlocked,
          createdAt: (customer as any).createdAt,
          totalOrders: stats.totalOrders,
          totalSpend: stats.totalSpend,
        };
      },
    );

    return { customers: customersWithStats, total };
  }

  @Patch(':id')
  async updateCustomer(
    @Request() req: any,
    @Param('id') customerId: string,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerWithStats> {
    const restaurantId = req.user.restaurantId;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(customerId)) {
      throw new HttpException('Invalid customer ID', HttpStatus.BAD_REQUEST);
    }

    // Get the actual customer to update
    const existingCustomer = await this.orderModel.db
      .collection('customers')
      .findOne({
        _id: new Types.ObjectId(customerId),
        restaurantId: new Types.ObjectId(restaurantId),
      });

    if (!existingCustomer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    // Update blocked status if provided
    let updatedCustomer = existingCustomer;
    if (typeof body.isBlocked === 'boolean') {
      const result = await this.customerRepository.setBlocked(
        customerId,
        body.isBlocked,
      );
      if (result) {
        updatedCustomer = result;
      }
    }

    // Update name if provided
    if (body.name !== undefined) {
      await this.customerRepository.updateName(customerId, body.name);
      updatedCustomer = {
        ...updatedCustomer,
        name: body.name,
      };
    }

    // Get order stats for this customer
    const orderStats = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          customerPhone: existingCustomer.phone,
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: '$total' },
        },
      },
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpend: 0 };

    return {
      id: customerId,
      phone: existingCustomer.phone,
      name: (updatedCustomer as any).name || '',
      isBlocked: (updatedCustomer as any).isBlocked,
      createdAt: existingCustomer.createdAt,
      totalOrders: stats.totalOrders,
      totalSpend: stats.totalSpend,
    };
  }
}
