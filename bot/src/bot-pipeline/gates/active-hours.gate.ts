import { Inject, Injectable, Logger } from '@nestjs/common';
import { AbstractMessageGate } from './abstract-message.gate';
import { MessageGateContext } from './message-gate.interface';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../../whatsapp/whatsapp-service.interface';
import {
  isRestaurantOpen,
  generateClosedMessage,
} from '../../utils/active-hours';

/** Gate 3: Reject messages when the restaurant is outside its active hours */
@Injectable()
export class ActiveHoursGate extends AbstractMessageGate {
  private readonly logger = new Logger(ActiveHoursGate.name);

  constructor(
    @Inject(IWHATSAPP_SERVICE)
    private readonly whatsappService: IWhatsappService,
  ) {
    super();
  }

  protected async check(ctx: MessageGateContext): Promise<boolean> {
    const restaurant = ctx.restaurant!;

    if (restaurant.activeHours && !isRestaurantOpen(restaurant.activeHours)) {
      this.logger.log(`Restaurant is closed, notifying ${ctx.sender}`);
      await this.whatsappService.markAsRead(ctx.messageId, ctx.credentials!);
      await this.whatsappService.sendTextMessage(
        ctx.sender,
        generateClosedMessage(restaurant.activeHours),
        ctx.credentials!,
      );
      return false;
    }

    return true;
  }
}
