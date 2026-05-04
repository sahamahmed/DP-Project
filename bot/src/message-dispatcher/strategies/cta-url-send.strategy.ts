import { IMessageSendStrategy } from './message-send.interface';
import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

/** Concrete Strategy: handles 'cta_url' messages */
export class CtaUrlSendStrategy implements IMessageSendStrategy {
  readonly messageType: MessageType['type'] = 'cta_url';

  async send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void> {
    await whatsappService.sendCtaUrlButton(
      contactNumber,
      message.headerText!,
      message.bodyText!,
      message.footerText || '',
      message.buttonText!,
      message.url!,
      credentials,
    );
  }
}
