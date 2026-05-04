import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Admin, AdminRole } from '../database/schemas/admin.schema';

export interface CreateAdminDto {
  name: string;
  email: string;
  password: string;
  restaurantId: string;
  role?: AdminRole;
}

@Injectable()
export class AdminRepository {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<Admin>,
  ) {}

  async create(data: CreateAdminDto): Promise<Admin> {
    const admin = new this.adminModel({
      ...data,
      restaurantId: new Types.ObjectId(data.restaurantId),
    });
    return admin.save();
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<Admin | null> {
    return this.adminModel.findById(id).exec();
  }

  async findByRestaurantId(restaurantId: string): Promise<Admin[]> {
    return this.adminModel
      .find({ restaurantId: new Types.ObjectId(restaurantId) })
      .select('-password')
      .exec();
  }

  async hasActiveAdmins(restaurantId: string): Promise<boolean> {
    const count = await this.adminModel.countDocuments({
      restaurantId: new Types.ObjectId(restaurantId),
      isActive: true,
    });
    return count > 0;
  }

  async getActiveAdmins(restaurantId: string): Promise<Admin[]> {
    return this.adminModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        isActive: true,
      })
      .select('-password')
      .exec();
  }

  async updateActiveStatus(
    adminId: string,
    isActive: boolean,
  ): Promise<Admin | null> {
    return this.adminModel
      .findByIdAndUpdate(
        adminId,
        {
          isActive,
          lastActiveAt: isActive ? new Date() : undefined,
        },
        { new: true },
      )
      .select('-password')
      .exec();
  }

  async updateProfile(
    adminId: string,
    data: { name?: string },
  ): Promise<Admin | null> {
    return this.adminModel
      .findByIdAndUpdate(adminId, data, { new: true })
      .select('-password')
      .exec();
  }
}
