import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'COD' | 'Card' | 'JazzCash' | 'Easypaisa';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface OrderItem {
  itemId: string;
  name: string;
  variantName?: string;
  quantity: number;
  baseUnit: string;
  pricePerUnit: number;
  subtotal: number;
}

export interface DeliveryInfo {
  name: string;
  phoneNumber: string;
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({
    type: [
      {
        itemId: String,
        name: String,
        variantName: String,
        quantity: Number,
        baseUnit: String,
        pricePerUnit: Number,
        subtotal: Number,
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  total: number;

  @Prop({
    type: {
      name: String,
      phoneNumber: String,
      address: String,
      location: {
        latitude: Number,
        longitude: Number,
      },
      instructions: String,
    },
    required: true,
  })
  deliveryInfo: DeliveryInfo;

  @Prop({
    type: String,
    enum: ['COD', 'Card', 'JazzCash', 'Easypaisa'],
    default: 'COD',
  })
  paymentMethod: PaymentMethod;

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  })
  status: OrderStatus;

  @Prop({
    type: String,
    enum: ['bot', 'agent'],
    default: 'bot',
  })
  source: 'bot' | 'agent';

  @Prop()
  estimatedDeliveryTime: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  cancelledAt: Date;

  @Prop()
  cancellationReason: string;

  @Prop()
  notes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Index for customer stats aggregation (used in customers endpoint)
OrderSchema.index({ restaurantId: 1, customerPhone: 1, status: 1 });

// Index for order listing by restaurant
OrderSchema.index({ restaurantId: 1, createdAt: -1 });
