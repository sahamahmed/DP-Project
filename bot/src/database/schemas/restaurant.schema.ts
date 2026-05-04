import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * FACTORY METHOD PATTERN — Product type discriminator
 *
 * RestaurantType tells the OrchestratorFactory which concrete Orchestrator
 * (product) to create for this restaurant. Adding a new flow (e.g. 'subscription')
 * means adding an enum value, a new orchestrator class, and one case in the factory.
 */
export enum RestaurantType {
  DEFAULT = 'default',       // Standard menu-browse → cart → checkout flow
  FAST_FOOD = 'fast_food',   // Streamlined flow: no variant selection, quick add
  FINE_DINING = 'fine_dining', // Extended flow: tasting menus, reservation prompts
}

// Day schedule for active hours
export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // "09:00" (24h format)
  closeTime: string; // "23:00" or "03:00" (next day for overnight)
}

export interface ActiveHours {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  timezone: string; // e.g., "Asia/Karachi"
}

// Default active hours (open 9 AM - 11 PM every day)
export const DEFAULT_ACTIVE_HOURS: ActiveHours = {
  sunday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  monday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
  timezone: 'Asia/Karachi',
};

@Schema({ timestamps: true })
export class Restaurant extends Document {
  @Prop({ required: true, unique: true })
  whatsappNumber: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phoneNumberId: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  minOrderAmount: number;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  imageUrl: string;

  @Prop({ type: Object, default: DEFAULT_ACTIVE_HOURS })
  activeHours: ActiveHours;

  @Prop({ enum: RestaurantType, default: RestaurantType.DEFAULT })
  restaurantType: RestaurantType;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
