/**
 * Credentials for WhatsApp API per restaurant
 * Used for true multi-tenancy where each restaurant has their own Meta app
 */
export interface RestaurantCredentials {
  phoneNumberId: string;
  accessToken: string;
}
