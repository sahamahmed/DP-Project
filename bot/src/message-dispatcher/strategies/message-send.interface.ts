import { MessageType } from '../../interfaces/message.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from '../../whatsapp/whatsapp-service.interface';

export interface IMessageSendStrategy {
  readonly messageType: MessageType['type'];

  send(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
    whatsappService: IWhatsappService,
  ): Promise<void>;
}
