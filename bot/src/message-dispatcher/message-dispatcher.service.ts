import { Inject, Injectable, Logger } from '@nestjs/common';
import { RestaurantCredentials } from '../interfaces/restaurant-credentials.interface';
import { MessageType } from '../interfaces/message.interface';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../whatsapp/whatsapp-service.interface';
import { IMessageSendStrategy } from './strategies/message-send.interface';
import { TextSendStrategy } from './strategies/text-send.strategy';
import { ButtonSendStrategy } from './strategies/button-send.strategy';
import { ListSendStrategy } from './strategies/list-send.strategy';
import { ImageSendStrategy } from './strategies/image-send.strategy';
import { CtaUrlSendStrategy } from './strategies/cta-url-send.strategy';

@Injectable()
export class MessageDispatcherService {
  private readonly logger = new Logger(MessageDispatcherService.name);
  private readonly strategies: Map<MessageType['type'], IMessageSendStrategy>;

  constructor(
    @Inject(IWHATSAPP_SERVICE)
    private readonly whatsappService: IWhatsappService,
  ) {
    const registered: IMessageSendStrategy[] = [
      new TextSendStrategy(),
      new ButtonSendStrategy(),
      new ListSendStrategy(),
      new ImageSendStrategy(),
      new CtaUrlSendStrategy(),
    ];

    this.strategies = new Map(
      registered.map((strategy) => [strategy.messageType, strategy]),
    );
  }

  async dispatchMessage(
    message: MessageType,
    contactNumber: string,
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const strategy = this.strategies.get(message.type);

    if (!strategy) {
      this.logger.warn(
        `No send strategy registered for message type: "${message.type}"`,
      );
      return;
    }

    await strategy.send(
      message,
      contactNumber,
      credentials,
      this.whatsappService,
    );
  }

  async markAsRead(
    messageId: string,
    credentials: RestaurantCredentials,
  ): Promise<void> {
    await this.whatsappService.markAsRead(messageId, credentials);
  }
}
