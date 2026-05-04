import { IMessageSendStrategy } from './message-send.interface';
import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

/** Concrete Strategy: handles 'button' messages */
export class ButtonSendStrategy implements IMessageSendStrategy {
  readonly messageType: MessageType['type'] = 'button';

  async send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void> {
    await whatsappService.sendButtonMessage(
      contactNumber,
      message.headerText || '',
      message.bodyText!,
      message.buttons!,
      credentials,
    );
  }
}
