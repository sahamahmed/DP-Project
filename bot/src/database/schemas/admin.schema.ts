import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

@Schema({ timestamps: true })
export class Admin extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  })
  restaurantId: Types.ObjectId;

  @Prop({ type: String, enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  lastActiveAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Index for efficient queries
AdminSchema.index({ restaurantId: 1, isActive: 1 });
AdminSchema.index({ email: 1 });
