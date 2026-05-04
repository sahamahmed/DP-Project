import { IMessageSendStrategy } from './message-send.interface';
import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Concrete Strategy: handles 'image' messages (includes post-send delay) */
export class ImageSendStrategy implements IMessageSendStrategy {
  readonly messageType: MessageType['type'] = 'image';

  async send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void> {
    await whatsappService.sendImageMessage(
      contactNumber,
      message.url!,
      message.caption,
      credentials,
    );
    // Delay after image to ensure delivery ordering before the next message
    await delay(2500);
  }
}
