import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from '../database/schemas/order.schema';

export interface OrderFilters {
  status?: OrderStatus;
  source?: 'bot' | 'agent';
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  cancellationReason?: string;
}

export interface CreateOrderDto {
  customerName: string;
  customerPhone: string;
  items: {
    name: string;
    variantName?: string;
    quantity: number;
    baseUnit?: string;
    pricePerUnit: number;
    subtotal: number;
  }[];
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  deliveryInfo?: {
    name?: string;
    phoneNumber?: string;
    address?: string;
    instructions?: string;
  };
  paymentMethod?: string;
  notes?: string;
  source: 'bot' | 'agent';
}

@Injectable()
export class OrderRepository {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async getOrders(
    restaurantId: string,
    filters: OrderFilters = {},
    limit = 50,
    skip = 0,
  ): Promise<{ orders: Order[]; total: number }> {
    const query: any = { restaurantId: new Types.ObjectId(restaurantId) };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        query.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        query.createdAt.$lte = filters.toDate;
      }
    }

    if (filters.search) {
      query.$or = [
        { orderId: { $regex: filters.search, $options: 'i' } },
        { customerName: { $regex: filters.search, $options: 'i' } },
        { customerPhone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return { orders, total };
  }

  async getOrderById(
    restaurantId: string,
    orderId: string,
  ): Promise<Order | null> {
    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        restaurantId: new Types.ObjectId(restaurantId),
      })
      .exec();
  }

  async getOrderByOrderId(
    restaurantId: string,
    orderId: string,
  ): Promise<Order | null> {
    return this.orderModel
      .findOne({
        orderId,
        restaurantId: new Types.ObjectId(restaurantId),
      })
      .exec();
  }

  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    data: UpdateOrderStatusDto,
  ): Promise<Order | null> {
    const updateData: any = { status: data.status };

    if (data.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      if (data.cancellationReason) {
        updateData.cancellationReason = data.cancellationReason;
      }
    }

    if (data.status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    return this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          restaurantId: new Types.ObjectId(restaurantId),
        },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  async getOrderStats(restaurantId: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    delivered: number;
    cancelled: number;
  }> {
    const stats = await this.orderModel.aggregate([
      { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    stats.forEach((s) => {
      if (s._id in result) {
        result[s._id as keyof typeof result] = s.count;
      }
      result.total += s.count;
    });

    return result;
  }

  async getTodayOrdersCount(restaurantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.orderModel.countDocuments({
      restaurantId: new Types.ObjectId(restaurantId),
      status: { $ne: 'cancelled' },
      createdAt: { $gte: startOfDay },
    });
  }

  async getTodayRevenue(restaurantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: startOfDay },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  async getOrderSourceStats(restaurantId: string): Promise<{
    botOrders: number;
    agentOrders: number;
    botPercentage: number;
    agentPercentage: number;
  }> {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$source', 'bot'] }, // Treat null/undefined as 'bot'
          count: { $sum: 1 },
        },
      },
    ]);

    let botOrders = 0;
    let agentOrders = 0;

    for (const r of result) {
      if (r._id === 'bot' || r._id === null || r._id === undefined) {
        botOrders += r.count;
      } else if (r._id === 'agent') {
        agentOrders = r.count;
      }
    }

    const total = botOrders + agentOrders;
    const botPercentage = total > 0 ? Math.round((botOrders / total) * 100) : 0;
    const agentPercentage =
      total > 0 ? Math.round((agentOrders / total) * 100) : 0;

    return { botOrders, agentOrders, botPercentage, agentPercentage };
  }

  async getDailyAnalytics(
    restaurantId: string,
    days: number = 7,
  ): Promise<{ date: string; orders: number; revenue: number }[]> {
    // Get today's date at start of day in local timezone
    const now = new Date();
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (days - 1),
      0,
      0,
      0,
      0,
    );

    // Get timezone offset in hours for MongoDB
    const timezoneOffset = now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const timezone = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const result = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: timezone,
            },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Fill in missing dates with zero values
    const dateMap = new Map<string, { orders: number; revenue: number }>();
    for (const r of result) {
      dateMap.set(r._id, { orders: r.orders, revenue: r.revenue });
    }

    const analytics: { date: string; orders: number; revenue: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Format as YYYY-MM-DD in local timezone
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const data = dateMap.get(dateStr) || { orders: 0, revenue: 0 };
      analytics.push({ date: dateStr, ...data });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return analytics;
  }

  async createOrder(
    restaurantId: string,
    data: CreateOrderDto,
  ): Promise<Order> {
    // Generate order ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `ORD-${dateStr}-${randomNum}`;

    const order = new this.orderModel({
      orderId,
      restaurantId: new Types.ObjectId(restaurantId),
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      items: data.items.map((item) => ({
        itemId: `MANUAL-${Date.now()}`,
        name: item.name,
        variantName: item.variantName,
        quantity: item.quantity,
        baseUnit: item.baseUnit || 'unit',
        pricePerUnit: item.pricePerUnit,
        subtotal: item.subtotal,
      })),
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee || 0,
      discount: data.discount || 0,
      total: data.total,
      deliveryInfo: {
        name: data.deliveryInfo?.name || data.customerName,
        phoneNumber: data.deliveryInfo?.phoneNumber || data.customerPhone,
        address: data.deliveryInfo?.address || '',
        instructions: data.deliveryInfo?.instructions,
      },
      paymentMethod: data.paymentMethod || 'COD',
      status: 'pending',
      source: data.source,
      notes: data.notes,
    });

    return order.save();
  }
}
