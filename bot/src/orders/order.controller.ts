import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OrderRepository,
  OrderFilters,
  UpdateOrderStatusDto,
  CreateOrderDto,
} from '../repositories/order.repository';
import { OrderStatus } from '../database/schemas/order.schema';
import { NotificationService } from '../services/notification.service';

const validStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Post()
  async createOrder(@Request() req: any, @Body() body: CreateOrderDto) {
    const restaurantId = req.user.restaurantId;

    // Validate required fields
    if (!body.customerName || !body.customerPhone) {
      throw new HttpException(
        'Customer name and phone are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!body.items || body.items.length === 0) {
      throw new HttpException(
        'At least one item is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!body.total || body.total <= 0) {
      throw new HttpException(
        'Total must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Set source as agent for manual orders
    body.source = 'agent';

    const order = await this.orderRepository.createOrder(restaurantId, body);

    // Create notification for new order (non-blocking)
    this.notificationService.notifyOrderCreated(
      restaurantId,
      order.orderId,
      order.customerName,
      order.total,
      'agent',
    );

    return {
      id: order._id.toString(),
      orderId: order.orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      deliveryInfo: order.deliveryInfo,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      source: order.source || 'agent',
      notes: order.notes,
      createdAt: (order as any).createdAt,
      updatedAt: (order as any).updatedAt,
    };
  }

  @Get()
  async getOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const restaurantId = req.user.restaurantId;

    const filters: OrderFilters = {};

    if (status && validStatuses.includes(status as OrderStatus)) {
      filters.status = status as OrderStatus;
    }

    if (source && ['bot', 'agent'].includes(source)) {
      filters.source = source as 'bot' | 'agent';
    }

    if (search) {
      filters.search = search;
    }

    const { orders, total } = await this.orderRepository.getOrders(
      restaurantId,
      filters,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );

    return {
      orders: orders.map((order) => ({
        id: order._id.toString(),
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
          baseUnit: item.baseUnit,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.subtotal,
        })),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        total: order.total,
        deliveryInfo: order.deliveryInfo,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        source: order.source || 'bot',
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        notes: order.notes,
        createdAt: (order as any).createdAt,
        updatedAt: (order as any).updatedAt,
      })),
      total,
    };
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    return this.orderRepository.getOrderStats(restaurantId);
  }

  @Get('today')
  async getTodayStats(@Request() req: any) {
    const restaurantId = req.user.restaurantId;

    const [count, revenue] = await Promise.all([
      this.orderRepository.getTodayOrdersCount(restaurantId),
      this.orderRepository.getTodayRevenue(restaurantId),
    ]);

    return { ordersCount: count, revenue };
  }

  @Get('analytics/daily')
  async getDailyAnalytics(@Request() req: any, @Query('days') days?: string) {
    const restaurantId = req.user.restaurantId;
    const numDays = days ? parseInt(days, 10) : 7;

    return this.orderRepository.getDailyAnalytics(restaurantId, numDays);
  }

  @Get('analytics/source')
  async getSourceStats(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    return this.orderRepository.getOrderSourceStats(restaurantId);
  }

  @Get(':id')
  async getOrder(@Request() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurantId;
    const order = await this.orderRepository.getOrderById(restaurantId, id);

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: order._id.toString(),
      orderId: order.orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      deliveryInfo: order.deliveryInfo,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      source: order.source || 'bot',
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      notes: order.notes,
      createdAt: (order as any).createdAt,
      updatedAt: (order as any).updatedAt,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    const restaurantId = req.user.restaurantId;

    if (!body.status || !validStatuses.includes(body.status)) {
      throw new HttpException(
        'Invalid status. Valid statuses: ' + validStatuses.join(', '),
        HttpStatus.BAD_REQUEST,
      );
    }

    const order = await this.orderRepository.updateOrderStatus(
      restaurantId,
      id,
      body,
    );

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: order._id.toString(),
      orderId: order.orderId,
      status: order.status,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
    };
  }
}
