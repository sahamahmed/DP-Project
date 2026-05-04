import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem } from '../database/schemas/menu-item.schema';
import { Category } from '../database/schemas/category.schema';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateMenuItemDto {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  imageUrl?: string;
  preparationTime?: number;
  sortOrder?: number;
  unitType?: 'countable' | 'weight' | 'volume';
  baseUnit?: string;
  minOrderQty?: number;
  orderIncrement?: number;
  variants?: { name: string; price: number; isAvailable?: boolean }[];
  sku?: string;
  isFeatured?: boolean;
}

export interface UpdateMenuItemDto {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  preparationTime?: number;
  sortOrder?: number;
  unitType?: 'countable' | 'weight' | 'volume';
  baseUnit?: string;
  minOrderQty?: number;
  orderIncrement?: number;
  variants?: { name: string; price: number; isAvailable?: boolean }[];
  sku?: string;
}

@Injectable()
export class MenuRepository {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  // ============ CATEGORY METHODS ============

  async getAllCategories(restaurantId: string): Promise<Category[]> {
    return this.categoryModel
      .find({ restaurantId: new Types.ObjectId(restaurantId) })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getActiveCategories(restaurantId: string): Promise<Category[]> {
    return this.categoryModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getCategoryById(categoryId: string): Promise<Category | null> {
    return this.categoryModel.findById(categoryId).exec();
  }

  async createCategory(
    restaurantId: string,
    data: CreateCategoryDto,
  ): Promise<Category> {
    const category = new this.categoryModel({
      ...data,
      restaurantId: new Types.ObjectId(restaurantId),
    });
    return category.save();
  }

  async updateCategory(
    categoryId: string,
    data: UpdateCategoryDto,
  ): Promise<Category | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { $set: data }, { new: true })
      .exec();
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const result = await this.categoryModel
      .findByIdAndDelete(categoryId)
      .exec();
    return !!result;
  }

  async getCategoryItemCount(categoryId: string): Promise<number> {
    return this.menuItemModel
      .countDocuments({ categoryId: new Types.ObjectId(categoryId) })
      .exec();
  }

  // ============ MENU ITEM METHODS ============

  async getAllMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({ restaurantId: new Types.ObjectId(restaurantId) })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getMenuItemsByCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        categoryId: new Types.ObjectId(categoryId),
      })
      .sort({ isFeatured: -1, sortOrder: 1, name: 1 })
      .exec();
  }

  async createMenuItem(
    restaurantId: string,
    data: CreateMenuItemDto,
  ): Promise<MenuItem> {
    const menuItem = new this.menuItemModel({
      ...data,
      restaurantId: new Types.ObjectId(restaurantId),
      categoryId: new Types.ObjectId(data.categoryId),
    });
    return menuItem.save();
  }

  async updateMenuItem(
    itemId: string,
    data: UpdateMenuItemDto,
  ): Promise<MenuItem | null> {
    const updateData: any = { ...data };
    if (data.categoryId) {
      updateData.categoryId = new Types.ObjectId(data.categoryId);
    }
    return this.menuItemModel
      .findByIdAndUpdate(itemId, { $set: updateData }, { new: true })
      .exec();
  }

  async deleteMenuItem(itemId: string): Promise<boolean> {
    const result = await this.menuItemModel.findByIdAndDelete(itemId).exec();
    return !!result;
  }

  async toggleItemAvailability(itemId: string): Promise<MenuItem | null> {
    const item = await this.menuItemModel.findById(itemId).exec();
    if (!item) return null;
    item.isAvailable = !item.isAvailable;
    return item.save();
  }

  async toggleItemFeatured(itemId: string): Promise<MenuItem | null> {
    const item = await this.menuItemModel.findById(itemId).exec();
    if (!item) return null;
    item.isFeatured = !item.isFeatured;
    return item.save();
  }

  // ============ EXISTING METHODS (for bot) ============

  async getMenuCategories(restaurantId: string): Promise<string[]> {
    const categories = await this.categoryModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    return categories.map((cat) => cat.name);
  }

  async getItemsByCategory(
    restaurantId: string,
    categoryName: string,
  ): Promise<MenuItem[]> {
    const category = await this.categoryModel
      .findOne({
        restaurantId: new Types.ObjectId(restaurantId),
        name: categoryName,
        isActive: true,
      })
      .exec();

    if (!category) {
      return [];
    }

    return await this.menuItemModel
      .find({
        restaurantId: new Types.ObjectId(restaurantId),
        categoryId: category._id,
        isAvailable: true,
      })
      .sort({ isFeatured: -1, sortOrder: 1, name: 1 })
      .exec();
  }

  async getItemById(itemId: string): Promise<MenuItem | null> {
    return await this.menuItemModel.findById(itemId).exec();
  }

  async getItemsByIds(itemIds: string[]): Promise<MenuItem[]> {
    return await this.menuItemModel
      .find({
        _id: { $in: itemIds.map((id) => new Types.ObjectId(id)) },
      })
      .exec();
  }
}
