import { RestaurantCredentials } from '../interfaces/restaurant-credentials.interface';

/**
 * DECORATOR PATTERN — Step 1: Component Interface
 *
 * IWhatsappService defines the contract that both the real WhatsappService
 * (Concrete Component) and all decorators must implement.
 *
 * Callers depend on this interface, not on WhatsappService directly.
 * This allows decorators to be swapped in transparently.
 *
 * Equivalent to the textbook:
 *   interface Coffee { double getCost(); String getDescription(); }
 */
export interface IWhatsappService {
  sendTextMessage(
    to: string,
    text: string,
    credentials: RestaurantCredentials,
  ): Promise<void>;

  sendButtonMessage(
    to: string,
    headerText: string,
    bodyText: string,
    buttons: string[],
    credentials: RestaurantCredentials,
  ): Promise<void>;

  sendListMessage(
    to: string,
    headerText: string | undefined,
    bodyText: string,
    footerText: string | undefined,
    buttonText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[],
    credentials: RestaurantCredentials,
  ): Promise<void>;

  sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string,
    credentials?: RestaurantCredentials,
  ): Promise<void>;

  sendCtaUrlButton(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    buttonText: string,
    url: string,
    credentials: RestaurantCredentials,
  ): Promise<void>;

  markAsRead(
    messageId: string,
    credentials: RestaurantCredentials,
  ): Promise<void>;
}

export const IWHATSAPP_SERVICE = 'IWhatsappService';
