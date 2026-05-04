import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { RestaurantCredentials } from '../interfaces/restaurant-credentials.interface';
import { IWhatsappService } from './whatsapp-service.interface';

interface WhatsappApiResponse {
  messages: Array<{ id: string }>;
}

interface WhatsappErrorData {
  error?: { message?: string };
}

interface WhatsappInteractivePayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  interactive: {
    type: string;
    body: { text: string };
    action: Record<string, unknown>;
    header?: { type: string; text: string };
    footer?: { text: string };
  };
}

/**
 * DECORATOR PATTERN — Step 2: Concrete Component
 *
 * WhatsappService is the real implementation. It is unchanged by the pattern.
 * The Decorator wraps it and adds behaviour on top.
 *
 * Equivalent to the textbook:
 *   class SimpleCoffee implements Coffee { ... }
 */
@Injectable()
export class WhatsappService implements IWhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseApiUrl = 'https://graph.facebook.com/v22.0';

  private validateCredentials(
    credentials?: RestaurantCredentials,
  ): RestaurantCredentials {
    if (!credentials) {
      throw new Error(
        'Restaurant credentials are required for WhatsApp API calls',
      );
    }
    if (!credentials.phoneNumberId) {
      throw new Error('phoneNumberId is required in restaurant credentials');
    }
    if (!credentials.accessToken) {
      throw new Error('accessToken is required in restaurant credentials');
    }
    return credentials;
  }

  private getApiUrl(credentials: RestaurantCredentials): string {
    return `${this.baseApiUrl}/${credentials.phoneNumberId}/messages`;
  }

  private getHeaders(credentials: RestaurantCredentials) {
    return {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const data = error.response?.data as WhatsappErrorData | undefined;
      return data?.error?.message || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  async sendTextMessage(
    to: string,
    text: string,
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      };

      await axios.post<WhatsappApiResponse>(
        this.getApiUrl(validCredentials),
        payload,
        { headers: this.getHeaders(validCredentials) },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send text message: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async sendButtonMessage(
    to: string,
    headerText: string,
    bodyText: string,
    buttons: string[],
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      const payload: WhatsappInteractivePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((btn, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index}_${btn.toLowerCase().replace(/\s+/g, '_')}`,
                title: btn.substring(0, 20),
              },
            })),
          },
        },
      };

      if (headerText) {
        payload.interactive.header = {
          type: 'text',
          text: headerText,
        };
      }

      await axios.post<WhatsappApiResponse>(
        this.getApiUrl(validCredentials),
        payload,
        { headers: this.getHeaders(validCredentials) },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send button message: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async sendListMessage(
    to: string,
    headerText: string | undefined,
    bodyText: string,
    footerText: string | undefined,
    buttonText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[],
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      const payload: WhatsappInteractivePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: bodyText },
          action: {
            button: buttonText.substring(0, 20),
            sections: sections.map((section) => ({
              title: section.title.substring(0, 24),
              rows: section.rows.map((row) => ({
                id: row.id,
                title: row.title.substring(0, 24),
                description: row.description?.substring(0, 72) || '',
              })),
            })),
          },
        },
      };

      if (headerText) {
        payload.interactive.header = {
          type: 'text',
          text: headerText,
        };
      }

      if (footerText) {
        payload.interactive.footer = { text: footerText };
      }

      await axios.post<WhatsappApiResponse>(
        this.getApiUrl(validCredentials),
        payload,
        { headers: this.getHeaders(validCredentials) },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send list message: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string,
    credentials?: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption || '',
        },
      };

      await axios.post<WhatsappApiResponse>(
        this.getApiUrl(validCredentials),
        payload,
        { headers: this.getHeaders(validCredentials) },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send image message: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async sendCtaUrlButton(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    buttonText: string,
    url: string,
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: {
            type: 'text',
            text: headerText,
          },
          body: { text: bodyText },
          footer: { text: footerText },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: buttonText,
              url,
            },
          },
        },
      };

      const response = await axios.post<WhatsappApiResponse>(
        this.getApiUrl(validCredentials),
        payload,
        { headers: this.getHeaders(validCredentials) },
      );

      this.logger.log(
        `CTA URL button sent to ${to}: ${response.data.messages[0].id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send CTA URL button: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async markAsRead(
    messageId: string,
    credentials: RestaurantCredentials,
  ): Promise<void> {
    const validCredentials = this.validateCredentials(credentials);
    try {
      await axios.post(
        this.getApiUrl(validCredentials),
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        { headers: this.getHeaders(validCredentials) },
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark message as read: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }
}
