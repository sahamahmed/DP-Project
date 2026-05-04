import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UnitType = 'countable' | 'weight' | 'volume';
export type BaseUnit =
  | 'piece'
  | 'box'
  | 'loaf'
  | 'pack'
  | 'dozen'
  | 'combo'
  | 'kg'
  | 'pound'
  | 'liter';

export interface MenuItemVariant {
  name: string;
  price: number;
  isAvailable?: boolean;
}

@Schema({ timestamps: true })
export class MenuItem extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  imageUrl: string;

  @Prop({ default: 0 })
  preparationTime: number;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({
    type: String,
    enum: ['countable', 'weight', 'volume'],
    default: 'countable',
  })
  unitType: UnitType;

  @Prop({
    type: String,
    enum: [
      'piece',
      'box',
      'loaf',
      'pack',
      'dozen',
      'combo',
      'kg',
      'pound',
      'liter',
    ],
    default: 'piece',
  })
  baseUnit: BaseUnit;

  @Prop({ default: 1 })
  minOrderQty: number;

  @Prop({ default: 1 })
  orderIncrement: number;

  @Prop({
    type: [
      {
        name: String,
        price: Number,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  variants: MenuItemVariant[];

  @Prop()
  sku: string;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, categoryId: 1 });
MenuItemSchema.index({ restaurantId: 1, isFeatured: 1, sortOrder: 1 });
