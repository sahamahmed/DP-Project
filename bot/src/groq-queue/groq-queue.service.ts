import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { LLMPayload } from '../interfaces/llm-message.interface';
import { BMQ_CONSTANTS } from '../constants/queue-constants';

@Injectable()
export class GroqQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GroqQueueService.name);
  private queueEvents: QueueEvents;

  constructor(
    @InjectQueue(BMQ_CONSTANTS.AI.GROQ_QUEUE)
    private readonly groqQueue: Queue,
  ) {}

  async onModuleInit() {
    // Initialize QueueEvents once and reuse
    this.queueEvents = new QueueEvents(this.groqQueue.name, {
      connection: this.groqQueue.opts.connection,
    });

    // Wait for QueueEvents to be ready
    await this.queueEvents.waitUntilReady();
    this.logger.log('QueueEvents initialized and ready');
  }

  async onModuleDestroy() {
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.logger.log('QueueEvents closed');
    }
  }

  async queueChatRequest(params: LLMPayload): Promise<string> {
    const job = await this.groqQueue.add('chat', params);

    try {
      const result = await job.waitUntilFinished(this.queueEvents);
      this.logger.debug(`Job ${job.id} finished with result`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error}`);
      throw error;
    }
  }
}
