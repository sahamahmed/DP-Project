import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  MenuRepository,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '../repositories/menu.repository';
import { SessionStoreService } from '../session-store/session-store.service';
import { RestaurantRepository } from '../database/restaurant.repository';

@Controller('api/menu')
@UseGuards(JwtAuthGuard)
export class MenuController {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly sessionStoreService: SessionStoreService,
    private readonly restaurantRepository: RestaurantRepository,
  ) {}

  /**
   * Helper to invalidate restaurant cache by restaurantId
   */
  private async invalidateCache(restaurantId: string): Promise<void> {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (restaurant) {
      await this.sessionStoreService.invalidateRestaurantCache(
        restaurant.whatsappNumber,
      );
    }
  }

  // ============ CATEGORY ENDPOINTS ============

  @Get('categories')
  async getCategories(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    const categories = await this.menuRepository.getAllCategories(restaurantId);

    return categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.name,
      description: cat.description,
      imageUrl: cat.imageUrl,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    }));
  }

  @Post('categories')
  async createCategory(@Request() req: any, @Body() body: CreateCategoryDto) {
    const restaurantId = req.user.restaurantId;

    if (!body.name || body.name.trim() === '') {
      throw new HttpException(
        'Category name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const category = await this.menuRepository.createCategory(restaurantId, {
      ...body,
      name: body.name.trim(),
    });

    await this.invalidateCache(restaurantId);

    return {
      id: category._id.toString(),
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    };
  }

  @Put('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    const category = await this.menuRepository.updateCategory(id, body);

    if (!category) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    await this.invalidateCache(req.user.restaurantId);

    return {
      id: category._id.toString(),
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    };
  }

  @Delete('categories/:id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    // Check if category has items
    const itemCount = await this.menuRepository.getCategoryItemCount(id);
    if (itemCount > 0) {
      throw new HttpException(
        `Cannot delete category with ${itemCount} items. Move or delete items first.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const deleted = await this.menuRepository.deleteCategory(id);
    if (!deleted) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    await this.invalidateCache(req.user.restaurantId);

    return { success: true };
  }

  // ============ MENU ITEM ENDPOINTS ============

  @Get('items')
  async getMenuItems(@Request() req: any) {
    const restaurantId = req.user.restaurantId;
    const items = await this.menuRepository.getAllMenuItems(restaurantId);
    const categories = await this.menuRepository.getAllCategories(restaurantId);

    // Create category map for efficient lookup
    const categoryMap = new Map(
      categories.map((cat) => [cat._id.toString(), cat.name]),
    );

    return items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      categoryId: item.categoryId.toString(),
      categoryName: categoryMap.get(item.categoryId.toString()) || 'Unknown',
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      preparationTime: item.preparationTime,
      sortOrder: item.sortOrder,
      unitType: item.unitType,
      baseUnit: item.baseUnit,
      minOrderQty: item.minOrderQty,
      orderIncrement: item.orderIncrement,
      variants: item.variants || [],
      sku: item.sku,
    }));
  }

  @Post('items')
  async createMenuItem(@Request() req: any, @Body() body: CreateMenuItemDto) {
    const restaurantId = req.user.restaurantId;

    if (!body.name || body.name.trim() === '') {
      throw new HttpException('Item name is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.categoryId) {
      throw new HttpException('Category is required', HttpStatus.BAD_REQUEST);
    }

    if (body.price === undefined || body.price < 0) {
      throw new HttpException(
        'Valid price is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const item = await this.menuRepository.createMenuItem(restaurantId, {
      ...body,
      name: body.name.trim(),
    });

    const category = await this.menuRepository.getCategoryById(body.categoryId);

    await this.invalidateCache(restaurantId);

    return {
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      categoryId: item.categoryId.toString(),
      categoryName: category?.name || 'Unknown',
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      preparationTime: item.preparationTime,
      sortOrder: item.sortOrder,
      unitType: item.unitType,
      baseUnit: item.baseUnit,
      minOrderQty: item.minOrderQty,
      orderIncrement: item.orderIncrement,
      variants: item.variants || [],
      sku: item.sku,
    };
  }

  @Put('items/:id')
  async updateMenuItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateMenuItemDto,
  ) {
    const item = await this.menuRepository.updateMenuItem(id, body);

    if (!item) {
      throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);
    }

    const category = await this.menuRepository.getCategoryById(
      item.categoryId.toString(),
    );

    await this.invalidateCache(req.user.restaurantId);

    return {
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      categoryId: item.categoryId.toString(),
      categoryName: category?.name || 'Unknown',
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      preparationTime: item.preparationTime,
      sortOrder: item.sortOrder,
      unitType: item.unitType,
      baseUnit: item.baseUnit,
      minOrderQty: item.minOrderQty,
      orderIncrement: item.orderIncrement,
      variants: item.variants || [],
      sku: item.sku,
    };
  }

  @Delete('items/:id')
  async deleteMenuItem(@Request() req: any, @Param('id') id: string) {
    const deleted = await this.menuRepository.deleteMenuItem(id);

    if (!deleted) {
      throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);
    }

    await this.invalidateCache(req.user.restaurantId);

    return { success: true };
  }

  @Patch('items/:id/availability')
  async toggleAvailability(@Request() req: any, @Param('id') id: string) {
    const item = await this.menuRepository.toggleItemAvailability(id);

    if (!item) {
      throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);
    }

    await this.invalidateCache(req.user.restaurantId);

    return { id: item._id.toString(), isAvailable: item.isAvailable };
  }

  @Patch('items/:id/featured')
  async toggleFeatured(@Request() req: any, @Param('id') id: string) {
    const item = await this.menuRepository.toggleItemFeatured(id);

    if (!item) {
      throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);
    }

    await this.invalidateCache(req.user.restaurantId);

    return { id: item._id.toString(), isFeatured: item.isFeatured };
  }
}
