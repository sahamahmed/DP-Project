import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { GroqQueueService } from './groq-queue.service';
import { GroqProcessor } from './groq-queue.processor';
import { ClientsModule } from '../llm-client/groq.module';
import { BMQ_CONSTANTS } from '../constants/queue-constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: BMQ_CONSTANTS.AI.GROQ_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || '';
        // Parse the Redis URL to extract connection details
        const url = new URL(redisUrl);
        const connectionOptions = {
          host: url.hostname,
          port: parseInt(url.port || '6379', 10),
          password: url.password || undefined,
          username: url.username || undefined,
          tls: url.protocol === 'rediss:' ? {} : undefined,
        };

        return {
          connection: connectionOptions,
          limiter: {
            max: 100,
            duration: 60_000,
          },
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: {
              age: 60, // Keep completed jobs for 60 seconds
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              count: 100,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    ClientsModule,
  ],
  providers: [GroqQueueService, GroqProcessor],
  exports: [GroqQueueService],
})
export class GroqQueueModule {}
