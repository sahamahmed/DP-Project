import { IMessageSendStrategy } from './message-send.interface';
import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

/** Concrete Strategy: handles 'text' messages */
export class TextSendStrategy implements IMessageSendStrategy {
  readonly messageType: MessageType['type'] = 'text';

  async send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void> {
    await whatsappService.sendTextMessage(
      contactNumber,
      message.text!,
      credentials,
    );
  }
}
