import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { LLMClientInterface } from '../interfaces/llm-client.interface';
import { ConfigService } from '@nestjs/config';
import { GroqConnection } from './groq-connection.singleton';
import { toErrorMessage } from '../utils/error.utils';

@Injectable()
export class GroqClientService implements LLMClientInterface, OnModuleInit {
  private readonly logger = new Logger(GroqClientService.name);

  readonly name = 'groq';

  constructor(private readonly configService: ConfigService) {}

  initialize() {
    return this.onModuleInit();
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.error('Groq API key is missing or empty');
      throw new Error('Groq API key is required');
    }

    try {
      /**
       * SINGLETON PATTERN — obtain the single shared Groq connection.
       * GroqConnection.getInstance() creates the Groq HTTP client exactly once
       * across the entire application. Any future service that needs the client
       * calls getInstance() and receives the same object — no second connection pool.
       */
      GroqConnection.getInstance(apiKey); // constructs the single Groq client on first call
      this.logger.log(
        'Groq client initialized successfully via GroqConnection singleton',
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Groq client: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async callLLM({
    messages,
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    maxTokens = 4000,
    topP = 0.95,
    response_format = { type: 'text' },
  }: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    response_format?: { type: 'text' | 'json_object' };
  }): Promise<string> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY') ?? '';
    const client = GroqConnection.getInstance(apiKey);

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        response_format,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from Groq API');
      return content;
    } catch (error) {
      this.logger.error(`Groq API error: ${toErrorMessage(error)}`);
      throw error;
    }
  }
}
