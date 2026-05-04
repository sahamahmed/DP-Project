import { Injectable } from '@nestjs/common';
import { FreshnessGate } from './gates/freshness.gate';
import { BlockGate } from './gates/block.gate';
import { ActiveHoursGate } from './gates/active-hours.gate';
import { AgentModeGate } from './gates/agent-mode.gate';
import { MessageGateContext } from './gates/message-gate.interface';

@Injectable()
export class MessageGatePipelineService {
  constructor(
    private readonly freshnessGate: FreshnessGate,
    private readonly blockGate: BlockGate,
    private readonly agentModeGate: AgentModeGate,
    private readonly activeHoursGate: ActiveHoursGate,
  ) {
    // AgentModeGate runs BEFORE ActiveHoursGate: a human agent actively
    // chatting must not have customer messages blocked by the closed-hours gate.
    this.freshnessGate
      .setNext(this.blockGate)
      .setNext(this.agentModeGate)
      .setNext(this.activeHoursGate);
  }

  async run(ctx: MessageGateContext): Promise<boolean> {
    return this.freshnessGate.handle(ctx);
  }
}
