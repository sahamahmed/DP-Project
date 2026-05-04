import { Inject, Injectable, Logger } from '@nestjs/common';
import { AbstractMessageGate } from './abstract-message.gate';
import { MessageGateContext } from './message-gate.interface';
import { CustomerRepository } from '../../repositories/customer.repository';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../../whatsapp/whatsapp-service.interface';

/** Gate 2: Reject blocked customers before any bot processing */
@Injectable()
export class BlockGate extends AbstractMessageGate {
  private readonly logger = new Logger(BlockGate.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    @Inject(IWHATSAPP_SERVICE)
    private readonly whatsappService: IWhatsappService,
  ) {
    super();
  }

  protected async check(ctx: MessageGateContext): Promise<boolean> {
    const restaurantId = (ctx.restaurant as any)._id.toString();
    const customer = await this.customerRepository.findOrCreate(
      restaurantId,
      ctx.sender,
      ctx.userName,
    );

    if (customer.isBlocked) {
      this.logger.log(`Blocked customer ${ctx.sender} attempted to message`);
      await this.whatsappService.markAsRead(ctx.messageId, ctx.credentials!);
      await this.whatsappService.sendTextMessage(
        ctx.sender,
        '🚫 Your account has been suspended. Please contact the restaurant directly for assistance.',
        ctx.credentials!,
      );
      return false;
    }

    return true;
  }
}
