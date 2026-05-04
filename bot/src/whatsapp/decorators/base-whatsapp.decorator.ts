import { IWhatsappService } from '../whatsapp-service.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';

/**
 * DECORATOR PATTERN — Step 3: Base Decorator
 *
 * WhatsappServiceDecorator holds a reference to an IWhatsappService delegate
 * and forwards every call to it unchanged.
 *
 * Concrete decorators extend this class and override only the methods
 * they want to augment — they never touch WhatsappService directly.
 *
 * Equivalent to the textbook:
 *   abstract class CoffeeDecorator implements Coffee {
 *     protected Coffee coffee;
 *     CoffeeDecorator(Coffee c) { this.coffee = c; }
 *     public double getCost() { return coffee.getCost(); }
 *   }
 */
export abstract class WhatsappServiceDecorator implements IWhatsappService {
  constructor(protected readonly delegate: IWhatsappService) {}

  sendTextMessage(to: string, text: string, credentials: RestaurantCredentials): Promise<void> {
    return this.delegate.sendTextMessage(to, text, credentials);
  }

  sendButtonMessage(
    to: string, headerText: string, bodyText: string,
    buttons: string[], credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.delegate.sendButtonMessage(to, headerText, bodyText, buttons, credentials);
  }

  sendListMessage(
    to: string, headerText: string | undefined, bodyText: string,
    footerText: string | undefined, buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
    credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.delegate.sendListMessage(
      to, headerText, bodyText, footerText, buttonText, sections, credentials,
    );
  }

  sendImageMessage(
    to: string, imageUrl: string, caption?: string, credentials?: RestaurantCredentials,
  ): Promise<void> {
    return this.delegate.sendImageMessage(to, imageUrl, caption, credentials);
  }

  sendCtaUrlButton(
    to: string, headerText: string, bodyText: string, footerText: string,
    buttonText: string, url: string, credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.delegate.sendCtaUrlButton(
      to, headerText, bodyText, footerText, buttonText, url, credentials,
    );
  }

  markAsRead(messageId: string, credentials: RestaurantCredentials): Promise<void> {
    return this.delegate.markAsRead(messageId, credentials);
  }
}
