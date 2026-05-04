import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer } from '../database/schemas/customer.schema';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) {}

  /**
   * Find customer by phone number for a specific restaurant
   */
  async findByPhone(
    restaurantId: string | Types.ObjectId,
    phone: string,
  ): Promise<Customer | null> {
    const restId =
      restaurantId instanceof Types.ObjectId
        ? restaurantId
        : new Types.ObjectId(restaurantId);

    return this.customerModel.findOne({ restaurantId: restId, phone }).exec();
  }

  /**
   * Find or create a customer - used when customer interacts with bot
   * Only creates if not exists, updates name if provided and different
   */
  async findOrCreate(
    restaurantId: string | Types.ObjectId,
    phone: string,
    name?: string,
  ): Promise<Customer> {
    const restId =
      restaurantId instanceof Types.ObjectId
        ? restaurantId
        : new Types.ObjectId(restaurantId);

    // First try to find existing customer
    let customer = await this.customerModel.findOne({
      restaurantId: restId,
      phone,
    });

    if (!customer) {
      // Create new customer
      customer = await this.customerModel.create({
        restaurantId: restId,
        phone,
        name: name || '',
        isBlocked: false,
      });
    } else if (name && customer.name !== name) {
      // Update name if it changed (e.g., from delivery info)
      customer.name = name;
      await customer.save();
    }

    return customer;
  }

  /**
   * Update customer name (from delivery info)
   */
  async updateName(
    customerId: string | Types.ObjectId,
    name: string,
  ): Promise<void> {
    const id =
      customerId instanceof Types.ObjectId
        ? customerId
        : new Types.ObjectId(customerId);

    await this.customerModel.updateOne({ _id: id }, { $set: { name } });
  }

  /**
   * Set blocked status
   */
  async setBlocked(
    customerId: string | Types.ObjectId,
    isBlocked: boolean,
  ): Promise<Customer | null> {
    const id =
      customerId instanceof Types.ObjectId
        ? customerId
        : new Types.ObjectId(customerId);

    return this.customerModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked } },
      { new: true },
    );
  }

  /**
   * Get all customers for a restaurant (for listing in admin portal)
   * Returns basic customer info - stats are aggregated separately
   */
  async findByRestaurant(
    restaurantId: string | Types.ObjectId,
    options: {
      limit?: number;
      skip?: number;
      search?: string;
    } = {},
  ): Promise<{ customers: Customer[]; total: number }> {
    const restId =
      restaurantId instanceof Types.ObjectId
        ? restaurantId
        : new Types.ObjectId(restaurantId);

    const { limit = 50, skip = 0, search } = options;

    const query: any = { restaurantId: restId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(query),
    ]);

    return { customers, total };
  }

  /**
   * Check if a customer is blocked
   */
  async isBlocked(
    restaurantId: string | Types.ObjectId,
    phone: string,
  ): Promise<boolean> {
    const customer = await this.findByPhone(restaurantId, phone);
    return customer?.isBlocked ?? false;
  }
}
