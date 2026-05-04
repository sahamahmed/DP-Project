import { Module } from '@nestjs/common';
import { GroqClientService } from './groq.service';

@Module({
  providers: [GroqClientService],
  exports: [GroqClientService],
})
export class ClientsModule {}
