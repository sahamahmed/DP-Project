import { Worker, Job } from 'bullmq';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqClientService } from '../llm-client/groq.service';
import { LLMPayload } from '../interfaces/llm-message.interface';

@Injectable()
export class GroqProcessor implements OnModuleInit {
  private readonly logger = new Logger(GroqProcessor.name);
  private worker: Worker;

  constructor(
    private readonly groqClient: GroqClientService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const queueName = 'groq-queue';
    const redisUrl = this.configService.get<string>('REDIS_URL') || '';

    // Parse the Redis URL to extract connection details
    const url = new URL(redisUrl);
    const connectionOptions = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    };

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const { name: jobType, data } = job as Job<LLMPayload>;

        this.logger.log(`Processing job [${jobType}] - ID: ${job.id}`);

        try {
          return await this.handleCommunication(data);
        } catch (err) {
          this.logger.error(`Error processing job ${jobType}: ${err.message}`);
          throw err;
        }
      },
      {
        connection: connectionOptions,
        concurrency: 5, // Reduced from 100 to prevent DNS resolution failures and rate limiting
      },
    );

    this.worker.on('completed', (job) =>
      this.logger.log(`✅ Job ${job.id} completed`),
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(`❌ Job ${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    this.logger.warn('Gracefully shutting down Groq worker...');
    if (this.worker) {
      await this.worker.close();
      this.logger.log('✅ Groq worker shut down cleanly.');
    }
  }

  private async handleCommunication(data: any) {
    try {
      return await this.groqClient.callLLM(data);
    } catch (error: any) {
      if (
        (error?.status === 404 &&
          error?.error?.error?.code === 'model_not_found') ||
        error?.error?.error?.code === 'model_decommissioned'
      ) {
        const fallbackModel =
          this.configService.get<string>('GROQ_FALLBACK_MODEL') ||
          'llama3-70b-8192';

        this.logger.warn(`Model not found. Falling back to "${fallbackModel}"`);

        try {
          return await this.groqClient.callLLM({
            ...data,
            model: fallbackModel,
          });
        } catch (fallbackError) {
          this.logger.error(`Fallback model "${fallbackModel}" also failed.`);
          throw fallbackError;
        }
      }

      throw error;
    }
  }
}
