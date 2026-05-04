import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Customer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: false })
  isBlocked: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Unique compound index - one customer per restaurant+phone pair
CustomerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

// Index for listing customers by restaurant (sorted by createdAt)
CustomerSchema.index({ restaurantId: 1, createdAt: -1 });
