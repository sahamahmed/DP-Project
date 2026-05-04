import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { Restaurant, ActiveHours } from './schemas/restaurant.schema';
import { MenuItem } from './schemas/menu-item.schema';
import { Order } from './schemas/order.schema';

@Injectable()
export class RestaurantRepository {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  // Restaurant methods
  async findByWhatsappNumber(
    whatsappNumber: string,
  ): Promise<HydratedDocument<Restaurant> | null> {
    return this.restaurantModel
      .findOne({ whatsappNumber, isActive: true })
      .exec();
  }

  async findById(id: string): Promise<HydratedDocument<Restaurant> | null> {
    return this.restaurantModel.findById(id).exec();
  }

  // Menu methods
  async getMenuCategories(restaurantId: string): Promise<string[]> {
    const categories = await this.menuItemModel.distinct('category', {
      restaurantId,
      isAvailable: true,
    });
    return categories as string[];
  }

  async getMenuItemsByCategory(
    restaurantId: string,
    category: string,
  ): Promise<HydratedDocument<MenuItem>[]> {
    return this.menuItemModel
      .find({ restaurantId, category, isAvailable: true })
      .exec();
  }

  async getMenuItem(
    itemId: string,
  ): Promise<HydratedDocument<MenuItem> | null> {
    return this.menuItemModel.findById(itemId).exec();
  }

  async getAllMenuItems(
    restaurantId: string,
  ): Promise<HydratedDocument<MenuItem>[]> {
    return this.menuItemModel.find({ restaurantId, isAvailable: true }).exec();
  }

  // Order methods
  async createOrder(
    orderData: Partial<Order>,
  ): Promise<HydratedDocument<Order>> {
    const order = new this.orderModel(orderData);
    return order.save();
  }

  async getOrderById(orderId: string): Promise<HydratedDocument<Order> | null> {
    return this.orderModel.findById(orderId).exec();
  }

  async getOrdersByCustomerPhone(
    customerPhone: string,
    restaurantId: string,
  ): Promise<HydratedDocument<Order>[]> {
    return this.orderModel
      .find({ customerPhone, restaurantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<HydratedDocument<Order> | null> {
    return this.orderModel
      .findByIdAndUpdate(orderId, { status }, { new: true })
      .exec();
  }

  // Active Hours methods
  async getActiveHours(restaurantId: string): Promise<ActiveHours | null> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .select('activeHours')
      .exec();
    return restaurant?.activeHours || null;
  }

  async updateActiveHours(
    restaurantId: string,
    activeHours: ActiveHours,
  ): Promise<HydratedDocument<Restaurant> | null> {
    return this.restaurantModel
      .findByIdAndUpdate(restaurantId, { activeHours }, { new: true })
      .exec();
  }

  // Restaurant Info methods
  async getRestaurantInfo(restaurantId: string): Promise<{
    name: string;
    address: string;
    city: string;
    deliveryFee: number;
    minOrderAmount: number;
    imageUrl: string;
  } | null> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .select('name address city deliveryFee minOrderAmount imageUrl')
      .exec();
    if (!restaurant) return null;
    return {
      name: restaurant.name,
      address: restaurant.address || '',
      city: restaurant.city || '',
      deliveryFee: restaurant.deliveryFee || 0,
      minOrderAmount: restaurant.minOrderAmount || 0,
      imageUrl: restaurant.imageUrl || '',
    };
  }

  async updateRestaurantInfo(
    restaurantId: string,
    info: {
      name?: string;
      address?: string;
      city?: string;
      deliveryFee?: number;
      minOrderAmount?: number;
      imageUrl?: string;
    },
  ): Promise<HydratedDocument<Restaurant> | null> {
    return this.restaurantModel
      .findByIdAndUpdate(restaurantId, { $set: info }, { new: true })
      .exec();
  }
}
