import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  AdminRepository,
  CreateAdminDto,
} from '../repositories/admin.repository';
import { Admin } from '../database/schemas/admin.schema';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  admin: {
    id: string;
    name: string;
    email: string;
    restaurantId: string;
    role: string;
    isActive: boolean;
  };
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  restaurantId: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signup(data: CreateAdminDto): Promise<AuthResponse> {
    // Check if email already exists
    const existing = await this.adminRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(data.password, this.SALT_ROUNDS);

    // Create admin
    const admin = await this.adminRepository.create({
      ...data,
      password: hashedPassword,
    });

    return this.generateAuthResponse(admin);
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const admin = await this.adminRepository.findByEmail(data.email);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = bcrypt.compareSync(data.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateAuthResponse(admin);
  }

  async validateToken(payload: JwtPayload): Promise<Admin | null> {
    return this.adminRepository.findById(payload.sub);
  }

  async getProfile(adminId: string): Promise<Omit<Admin, 'password'> | null> {
    const admin = await this.adminRepository.findById(adminId);
    if (!admin) return null;

    const adminObj = admin.toObject() as Admin & { password: string };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...adminWithoutPassword } = adminObj;
    return adminWithoutPassword as Omit<Admin, 'password'>;
  }

  private generateAuthResponse(admin: Admin): AuthResponse {
    const payload: JwtPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      restaurantId: admin.restaurantId.toString(),
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload) as string;

    return {
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        restaurantId: admin.restaurantId.toString(),
        role: admin.role,
        isActive: admin.isActive,
      },
      accessToken,
    };
  }
}
