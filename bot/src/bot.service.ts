import { Injectable, Logger } from '@nestjs/common';
import { SessionStoreService } from './session-store/session-store.service';
import { BotContextService } from './bot-context/bot-context.service';
import { MessageDispatcherService } from './message-dispatcher/message-dispatcher.service';
import {
  WhatsappBodyPayload,
  whatsappQuery,
} from './interfaces/whatsapp.interface';
import { RestaurantResolverFactory } from './restaurant-resolution/restaurant-resolver.factory';
import { OrchestratorFactory } from './orchestrators/orchestrator.factory';
import { Restaurant } from './database/schemas/restaurant.schema';
import { RestaurantCredentials } from './interfaces/restaurant-credentials.interface';
import { HydratedDocument } from 'mongoose';
import { ConversationRepository } from './repositories/conversation.repository';
import {
  MessageSender,
  MessageDirection,
  MessageContentType,
} from './database/schemas/message.schema';
import { MessageType } from './interfaces/message.interface';
import { MessageGatePipelineService } from './bot-pipeline/message-gate-pipeline.service';
import { MessageGateContext } from './bot-pipeline/gates/message-gate.interface';
import { BotEventSubject } from './events/bot-event.subject';
import { toErrorMessage, toErrorStack } from './utils/error.utils';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly sessionStore: SessionStoreService,
    private readonly messageDispatcher: MessageDispatcherService,
    private readonly restaurantResolverFactory: RestaurantResolverFactory,
    private readonly orchestratorFactory: OrchestratorFactory,
    private readonly conversationRepository: ConversationRepository,
    // Pattern 2: Chain of Responsibility — gate pipeline
    private readonly gatePipeline: MessageGatePipelineService,
    // Pattern 4: Observer — Subject; ChatGateway is NOT injected here
    private readonly botSubject: BotEventSubject,
  ) {}

  async handleIncomingMessage(body: WhatsappBodyPayload): Promise<void> {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry) {
      const changes = entry.changes?.[0];
      const message = changes?.value?.messages?.[0];
      if (!message) continue;

      const sender = message.from || '';
      const messageId = message.id;
      const userName = changes.value.contacts?.[0]?.profile?.name || 'Customer';
      const receiver = changes.value.metadata?.display_phone_number;

      const available = await this.sessionStore.acquireUserLock(sender);
      if (!available) {
        this.logger.log(`User ${sender} is already being processed`);
        return;
      }

      try {
        const restaurant = await this.resolveRestaurant(receiver);
        if (!restaurant) {
          this.logger.warn(
            `Could not resolve restaurant for receiver: ${receiver}`,
          );
          continue;
        }

        const credentials = this.extractCredentials(restaurant);
        const restaurantId = (restaurant as any)._id.toString();

        const gateCtx: MessageGateContext = {
          message,
          sender,
          messageId,
          userName,
          receiver,
          restaurant,
          credentials,
        };
        const passed = await this.gatePipeline.run(gateCtx);

        if (!passed) {
          if (gateCtx.wasAgentModeBlock) {
            const query = this.extractQuery(message);
            if (query) {
              const conversation =
                await this.conversationRepository.upsertConversation(
                  restaurantId,
                  sender,
                  userName,
                );
              const conversationId = conversation._id.toString();
              await this.conversationRepository.insertMessage(
                conversation._id,
                {
                  sender: MessageSender.USER,
                  direction: MessageDirection.INBOUND,
                  type: this.mapQueryTypeToMessageType(query.type),
                  text: query.text || undefined,
                  rawPayload: { messageId, type: message.type },
                },
              );
              this.botSubject.notifyObservers({
                type: 'conversation.updated',
                restaurantId,
                conversationId,
                payload: {
                  customerPhone: sender,
                  customerName: userName,
                  status: 'agent',
                  lastMessage: query.text || `[${query.type}]`,
                  updatedAt: new Date(),
                  messageFrom: 'customer',
                },
              });
              this.botSubject.notifyObservers({
                type: 'message.customer_received',
                restaurantId,
                conversationId,
                payload: {
                  customerId: sender,
                  customerPhone: sender,
                  customerName: userName,
                  messageId,
                  content: query.text || '',
                  messageType: query.type,
                  timestamp: new Date(),
                },
              });
            }
          }
          continue;
        }

        await this.messageDispatcher.markAsRead(messageId, credentials);

        const query = this.extractQuery(message);
        if (!query) {
          this.logger.log(
            `Could not extract query from message type: ${message.type}`,
          );
          continue;
        }

        const conversation =
          await this.conversationRepository.upsertConversation(
            restaurantId,
            sender,
            userName,
          );

        await this.conversationRepository.insertMessage(conversation._id, {
          sender: MessageSender.USER,
          direction: MessageDirection.INBOUND,
          type: this.mapQueryTypeToMessageType(query.type),
          text: query.text || undefined,
          location: query.location,
          rawPayload: { messageId, type: message.type },
        });

        this.botSubject.notifyObservers({
          type: 'conversation.updated',
          restaurantId,
          conversationId: conversation._id.toString(),
          payload: {
            customerPhone: sender,
            customerName: userName,
            status: conversation.status.toLowerCase(),
            lastMessage: query.text || `[${query.type}]`,
            updatedAt: new Date(),
            messageFrom: 'customer',
          },
        });

        this.botSubject.notifyObservers({
          type: 'message.customer_received',
          restaurantId,
          conversationId: conversation._id.toString(),
          payload: {
            customerId: sender,
            customerPhone: sender,
            customerName: userName,
            messageId,
            content: query.text || '',
            messageType: query.type,
            timestamp: new Date(),
          },
        });

        const context = new BotContextService(
          this.sessionStore,
          sender,
          this.messageDispatcher,
          credentials,
        );

        const session = await context.getSession();
        if (!session?.conversationState?.conversationId) {
          await context.setConversationState({
            conversationId: conversation._id.toString(),
          });
        }

        const orchestrator = this.orchestratorFactory.getOrchestrator(
          receiver,
          restaurant,
        );
        const messages = await orchestrator.handleMessage(
          context,
          query,
          { name: userName, phoneNumber: sender },
          restaurant,
        );

        for (const msg of messages) {
          await this.messageDispatcher.dispatchMessage(
            msg,
            sender,
            credentials,
          );

          await this.conversationRepository.insertMessage(conversation._id, {
            sender: MessageSender.BOT,
            direction: MessageDirection.OUTBOUND,
            type: this.mapMessageTypeToContentType(msg),
            text: this.extractTextFromMessage(msg),
          });

          this.botSubject.notifyObservers({
            type: 'message.bot_sent',
            restaurantId,
            conversationId: conversation._id.toString(),
            payload: {
              messageId: `bot_${Date.now()}`,
              content: this.extractTextFromMessage(msg) || '',
              messageType: msg.type,
              timestamp: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(
          `Error processing message: ${toErrorMessage(error)}`,
          toErrorStack(error),
        );
      } finally {
        await this.sessionStore.releaseUserLock(sender);
      }
    }
  }

  private async resolveRestaurant(
    receiver: string,
  ): Promise<Restaurant | HydratedDocument<Restaurant> | null> {
    const resolver = this.restaurantResolverFactory.getResolver(receiver);
    return resolver.resolveRestaurant(receiver);
  }

  private extractCredentials(
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): RestaurantCredentials {
    return {
      phoneNumberId: restaurant.phoneNumberId,
      accessToken: restaurant.accessToken,
    };
  }

  private extractQuery(message: any): whatsappQuery | null {
    if (message.text?.body) return { type: 'text', text: message.text.body };
    if (message.interactive?.button_reply) {
      return {
        type: 'button_reply',
        text: message.interactive.button_reply.title,
        id: message.interactive.button_reply.id,
      };
    }
    if (message.interactive?.list_reply) {
      return {
        type: 'list_reply',
        text: message.interactive.list_reply.title,
        id: message.interactive.list_reply.id,
      };
    }
    if (message.location) {
      return {
        type: 'location',
        text: '',
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
        },
      };
    }
    return null;
  }

  private mapQueryTypeToMessageType(
    queryType: whatsappQuery['type'],
  ): MessageContentType {
    switch (queryType) {
      case 'text':
        return MessageContentType.TEXT;
      case 'button_reply':
        return MessageContentType.BUTTON;
      case 'list_reply':
        return MessageContentType.LIST;
      case 'location':
        return MessageContentType.LOCATION;
      default:
        return MessageContentType.TEXT;
    }
  }

  private mapMessageTypeToContentType(msg: MessageType): MessageContentType {
    switch (msg.type) {
      case 'text':
        return MessageContentType.TEXT;
      case 'button':
        return MessageContentType.BUTTON;
      case 'list':
        return MessageContentType.LIST;
      case 'image':
        return MessageContentType.IMAGE;
      case 'document':
        return MessageContentType.DOCUMENT;
      default:
        return MessageContentType.TEXT;
    }
  }

  private extractTextFromMessage(msg: MessageType): string | undefined {
    switch (msg.type) {
      case 'text':
        return msg.text;
      case 'button':
      case 'list':
        return msg.bodyText;
      default:
        return undefined;
    }
  }
}
