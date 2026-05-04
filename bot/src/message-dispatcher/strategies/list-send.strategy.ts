import { IMessageSendStrategy } from './message-send.interface';
import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

/** Concrete Strategy: handles 'list' messages */
export class ListSendStrategy implements IMessageSendStrategy {
  readonly messageType: MessageType['type'] = 'list';

  async send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void> {
    await whatsappService.sendListMessage(
      contactNumber,
      message.headerText,
      message.bodyText!,
      message.footerText,
      message.buttonText!,
      message.sections!,
      credentials,
    );
  }
}
