import { Inject, Injectable, Logger } from '@nestjs/common';
import { AbstractMessageGate } from './abstract-message.gate';
import { MessageGateContext } from './message-gate.interface';
import {
  IWhatsappService,
  IWHATSAPP_SERVICE,
} from '../../whatsapp/whatsapp-service.interface';
import { SessionStoreService } from '../../session-store/session-store.service';

/** Gate 4: Skip bot processing if a human agent has taken over the conversation */
@Injectable()
export class AgentModeGate extends AbstractMessageGate {
  private readonly logger = new Logger(AgentModeGate.name);

  constructor(
    private readonly sessionStore: SessionStoreService,
    @Inject(IWHATSAPP_SERVICE)
    private readonly whatsappService: IWhatsappService,
  ) {
    super();
  }

  protected async check(ctx: MessageGateContext): Promise<boolean> {
    const session = await this.sessionStore.getUserSession(
      ctx.sender,
      ctx.credentials!.phoneNumberId,
    );

    if (session?.conversationState?.agentMode) {
      this.logger.log(`Agent mode active for ${ctx.sender}, skipping bot`);
      await this.whatsappService.markAsRead(ctx.messageId, ctx.credentials!);
      ctx.wasAgentModeBlock = true;
      return false;
    }

    return true;
  }
}
