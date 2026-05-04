import { Injectable, Logger } from '@nestjs/common';
import { WhatsappServiceDecorator } from './base-whatsapp.decorator';
import { IWhatsappService } from '../whatsapp-service.interface';
import { RestaurantCredentials } from '../../interfaces/restaurant-credentials.interface';

/**
 * DECORATOR PATTERN — Step 4: Concrete Decorator
 *
 * RetryWhatsappDecorator wraps any IWhatsappService and adds:
 *   - Automatic retry with exponential back-off on transient failures
 *   - Structured per-call logging (attempt number, method name, outcome)
 *
 * WhatsappService is completely unchanged.
 * Callers that depend on IWhatsappService receive this decorator transparently.
 *
 * Equivalent to the textbook:
 *   class MilkDecorator extends CoffeeDecorator {
 *     public double getCost() { return coffee.getCost() + 0.25; }
 *   }
 *
 * Future extension — stack another decorator on top without changing this one:
 *   new RateLimitWhatsappDecorator(new RetryWhatsappDecorator(new WhatsappService()))
 */
@Injectable()
export class RetryWhatsappDecorator extends WhatsappServiceDecorator {
  private readonly logger = new Logger(RetryWhatsappDecorator.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 500;

  constructor(delegate: IWhatsappService) {
    super(delegate);
  }

  // Override every send method to add retry behaviour.
  // markAsRead is intentionally NOT retried (idempotency concern is different).

  override async sendTextMessage(
    to: string, text: string, credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.withRetry('sendTextMessage', () =>
      super.sendTextMessage(to, text, credentials),
    );
  }

  override async sendButtonMessage(
    to: string, headerText: string, bodyText: string,
    buttons: string[], credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.withRetry('sendButtonMessage', () =>
      super.sendButtonMessage(to, headerText, bodyText, buttons, credentials),
    );
  }

  override async sendListMessage(
    to: string, headerText: string | undefined, bodyText: string,
    footerText: string | undefined, buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
    credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.withRetry('sendListMessage', () =>
      super.sendListMessage(to, headerText, bodyText, footerText, buttonText, sections, credentials),
    );
  }

  override async sendImageMessage(
    to: string, imageUrl: string, caption?: string, credentials?: RestaurantCredentials,
  ): Promise<void> {
    return this.withRetry('sendImageMessage', () =>
      super.sendImageMessage(to, imageUrl, caption, credentials),
    );
  }

  override async sendCtaUrlButton(
    to: string, headerText: string, bodyText: string, footerText: string,
    buttonText: string, url: string, credentials: RestaurantCredentials,
  ): Promise<void> {
    return this.withRetry('sendCtaUrlButton', () =>
      super.sendCtaUrlButton(to, headerText, bodyText, footerText, buttonText, url, credentials),
    );
  }

  /** Core retry logic with exponential back-off */
  private async withRetry<T>(
    methodName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(`[${methodName}] attempt ${attempt}/${this.MAX_RETRIES}`);
        const result = await operation();
        if (attempt > 1) {
          this.logger.log(`[${methodName}] succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === this.MAX_RETRIES;

        if (isLastAttempt) {
          this.logger.error(
            `[${methodName}] failed after ${this.MAX_RETRIES} attempts: ${(error as Error).message}`,
          );
        } else {
          const delayMs = this.BASE_DELAY_MS * Math.pow(2, attempt - 1); // 500, 1000, 2000...
          this.logger.warn(
            `[${methodName}] attempt ${attempt} failed, retrying in ${delayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }
}
