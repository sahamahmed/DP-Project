import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRepository } from '../repositories/admin.repository';
import { RestaurantRepository } from '../database/restaurant.repository';
import { MediaManagerService } from '../media-manager/media-manager.service';
import { SessionStoreService } from '../session-store/session-store.service';
import {
  ActiveHours,
  DEFAULT_ACTIVE_HOURS,
} from '../database/schemas/restaurant.schema';
import 'multer'; // Required for Express.Multer types

class UpdateStatusDto {
  isActive: boolean;
}

class UpdateActiveHoursDto {
  activeHours: ActiveHours;
}

class UpdateRestaurantInfoDto {
  name?: string;
  address?: string;
  city?: string;
  deliveryFee?: number;
  minOrderAmount?: number;
  imageUrl?: string;
}

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly restaurantRepository: RestaurantRepository,
    private readonly mediaManagerService: MediaManagerService,
    private readonly sessionStoreService: SessionStoreService,
  ) {}

  /**
   * Update current admin's active status
   */
  @Patch('status')
  async updateStatus(@Request() req: any, @Body() body: UpdateStatusDto) {
    const admin = await this.adminRepository.updateActiveStatus(
      req.user.sub,
      body.isActive,
    );

    if (!admin) {
      return null;
    }

    return {
      id: admin._id.toString(),
      isActive: admin.isActive,
      lastActiveAt: admin.lastActiveAt,
    };
  }

  /**
   * Get current admin's profile
   */
  @Get('profile')
  async getProfile(@Request() req: any) {
    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      return null;
    }

    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      restaurantId: admin.restaurantId.toString(),
      role: admin.role,
      isActive: admin.isActive,
      lastActiveAt: admin.lastActiveAt,
    };
  }

  /**
   * Check if any admin is active for a restaurant (public endpoint for bot)
   */
  @Get('restaurants/:restaurantId/active')
  async checkActiveAdmins(@Param('restaurantId') restaurantId: string) {
    const hasActive = await this.adminRepository.hasActiveAdmins(restaurantId);
    const activeAdmins = hasActive
      ? await this.adminRepository.getActiveAdmins(restaurantId)
      : [];

    return {
      hasActiveAdmins: hasActive,
      count: activeAdmins.length,
    };
  }

  /**
   * Get restaurant active hours
   */
  @Get('active-hours')
  async getActiveHours(@Request() req: any) {
    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const activeHours = await this.restaurantRepository.getActiveHours(
      admin.restaurantId.toString(),
    );

    return activeHours || DEFAULT_ACTIVE_HOURS;
  }

  /**
   * Update restaurant active hours
   */
  @Patch('active-hours')
  async updateActiveHours(
    @Request() req: any,
    @Body() body: UpdateActiveHoursDto,
  ) {
    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const restaurant = await this.restaurantRepository.updateActiveHours(
      admin.restaurantId.toString(),
      body.activeHours,
    );

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Invalidate cache so bot picks up new hours
    await this.sessionStoreService.invalidateRestaurantCache(
      restaurant.whatsappNumber,
    );

    return restaurant.activeHours;
  }

  /**
   * Get restaurant info
   */
  @Get('restaurant')
  async getRestaurantInfo(@Request() req: any) {
    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const info = await this.restaurantRepository.getRestaurantInfo(
      admin.restaurantId.toString(),
    );

    if (!info) {
      throw new NotFoundException('Restaurant not found');
    }

    return info;
  }

  /**
   * Update restaurant info
   */
  @Patch('restaurant')
  async updateRestaurantInfo(
    @Request() req: any,
    @Body() body: UpdateRestaurantInfoDto,
  ) {
    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const restaurant = await this.restaurantRepository.updateRestaurantInfo(
      admin.restaurantId.toString(),
      body,
    );

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Invalidate cache so bot picks up new info
    await this.sessionStoreService.invalidateRestaurantCache(
      restaurant.whatsappNumber,
    );

    return {
      name: restaurant.name,
      address: restaurant.address || '',
      city: restaurant.city || '',
      deliveryFee: restaurant.deliveryFee || 0,
      minOrderAmount: restaurant.minOrderAmount || 0,
      imageUrl: restaurant.imageUrl || '',
    };
  }

  /**
   * Upload restaurant image
   */
  @Post('restaurant/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadRestaurantImage(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const admin = await this.adminRepository.findById(req.user.sub);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Upload to DigitalOcean Spaces
    const [message, success, fileInfo] =
      await this.mediaManagerService.upload(file);

    if (!success || !fileInfo) {
      throw new BadRequestException(`Upload failed: ${message}`);
    }

    // Update restaurant with new image URL
    const restaurant = await this.restaurantRepository.updateRestaurantInfo(
      admin.restaurantId.toString(),
      { imageUrl: fileInfo.url },
    );

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Invalidate cache so bot picks up new image
    await this.sessionStoreService.invalidateRestaurantCache(
      restaurant.whatsappNumber,
    );

    return {
      imageUrl: fileInfo.url,
    };
  }
}
