import { Injectable, Logger } from '@nestjs/common';
import { AbstractMessageGate } from './abstract-message.gate';
import { MessageGateContext } from './message-gate.interface';

/** Gate 1: Ignore messages older than 60 seconds */
@Injectable()
export class FreshnessGate extends AbstractMessageGate {
  private readonly logger = new Logger(FreshnessGate.name);
  private readonly MAX_AGE_MS = 60_000;

  protected async check(ctx: MessageGateContext): Promise<boolean> {
    const messageTimestamp = parseInt(ctx.message.timestamp, 10) * 1000;
    const age = Date.now() - messageTimestamp;

    if (age >= this.MAX_AGE_MS) {
      this.logger.log(`Skipping stale message from ${ctx.sender} (age: ${age}ms)`);
      return false;
    }

    return true;
  }
}
