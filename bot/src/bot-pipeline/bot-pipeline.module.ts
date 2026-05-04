import { Module, forwardRef } from '@nestjs/common';
import { FreshnessGate } from './gates/freshness.gate';
import { BlockGate } from './gates/block.gate';
import { ActiveHoursGate } from './gates/active-hours.gate';
import { AgentModeGate } from './gates/agent-mode.gate';
import { MessageGatePipelineService } from './message-gate-pipeline.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SessionStoreModule } from '../session-store/session-store.module';
import { CustomerModule } from '../customers/customer.module';

@Module({
  imports: [
    forwardRef(() => WhatsappModule),
    SessionStoreModule,
    CustomerModule,
  ],
  providers: [
    FreshnessGate,
    BlockGate,
    ActiveHoursGate,
    AgentModeGate,
    MessageGatePipelineService,
  ],
  exports: [MessageGatePipelineService],
})
export class BotPipelineModule {}
