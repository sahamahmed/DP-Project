/* eslint-disable no-case-declarations */
import { Injectable } from '@nestjs/common';
import { MenuHandlerService } from '../handlers/menu.handler';
import { CheckoutHandlerService } from '../handlers/checkout.handler';
import { TrackingHandlerService } from '../handlers/tracking.handler';
import { BotContextService } from '../bot-context/bot-context.service';
import {
  IntentName,
  UserSession,
  UserState,
} from '../interfaces/session.interface';
import { MessageType } from '../interfaces/message.interface';
import { whatsappQuery } from '../interfaces/whatsapp.interface';
import { Restaurant } from '../database/schemas/restaurant.schema';
import { HydratedDocument } from 'mongoose';
import { Orchestrator } from '../interfaces/orchestrator.interface';
import { ChatGateway } from '../gateways/chat.gateway';
import { ConversationRepository } from '../repositories/conversation.repository';
import { ConversationStatus } from '../database/schemas/conversation.schema';
import { Types } from 'mongoose';
import {
  createGreetingMessages,
  WHAT_NEXT_PROMPT,
  UNKNOWN_INTENT_PROMPT,
} from '../constants/menu-templates';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class RestaurantOrchestratorService implements Orchestrator {
  constructor(
    private readonly menuHandler: MenuHandlerService,
    private readonly checkoutHandler: CheckoutHandlerService,
    private readonly trackingHandler: TrackingHandlerService,
    private readonly chatGateway: ChatGateway,
    private readonly conversationRepository: ConversationRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async handleMessage(
    context: BotContextService,
    query: whatsappQuery,
    user: UserState,
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): Promise<MessageType[]> {
    const session = await context.getSession();
    const isFirstMessage =
      !session ||
      (!session.conversationState?.intentName &&
        session.conversationState?.dialogEnded === undefined);

    if (isFirstMessage) {
      await context.setUserState(user);
      await context.setConversationState({
        conversationId: session?.conversationState?.conversationId,
        dialogEnded: true,
      });
      return this.greet(user, restaurant);
    } else {
      return this.dispatchIntent(context, query, session, restaurant);
    }
  }

  private greet(
    user: UserState,
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): MessageType[] {
    return createGreetingMessages(
      user.name,
      restaurant.name,
      restaurant.imageUrl,
    );
  }

  private async dispatchIntent(
    context: BotContextService,
    query: whatsappQuery,
    session: UserSession,
    restaurant: Restaurant | HydratedDocument<Restaurant>,
  ): Promise<MessageType[]> {
    const messages: MessageType[] = [];

    if (query.text?.trim().toLocaleLowerCase() === 'menu') {
      await context.setConversationState({
        step: undefined,
        dialogEnded: true,
        intentName: undefined,
        payload: session.conversationState.payload,
      });
      messages.push(...this.greet(session.userState, restaurant));
      return messages;
    }

    const intentName =
      session.conversationState?.intentName || this.resolveIntent(query);
    const dialogEnded = session.conversationState?.dialogEnded;
    const intent = dialogEnded ? this.resolveIntent(query) : intentName;

    await context.setConversationState({
      intentName: intent,
      dialogEnded: false,
    });

    let result: MessageType;

    switch (intent) {
      case 'browsing':
        result = await this.menuHandler.handle(context, query, restaurant);
        break;
      case 'checkout':
        result = await this.checkoutHandler.handle(context, query, restaurant);
        break;
      case 'tracking':
        result = await this.trackingHandler.handle(context, query, restaurant);
        break;
      case 'greeting':
        await context.setConversationState({ dialogEnded: true });
        return this.greet(session.userState, restaurant);
      case 'agent':
        // Check if any admin is active for this restaurant
        const restaurantId = (restaurant as any)._id?.toString();
        const hasActiveAdmins = restaurantId
          ? await this.adminRepository.hasActiveAdmins(restaurantId)
          : false;

        if (!hasActiveAdmins) {
          // No agents available - show message and return to menu
          await context.setConversationState({ dialogEnded: true });
          return [
            {
              type: 'text',
              text: '😔 Sorry, no agents are available right now. Please try again later or continue using our automated service.',
            },
            WHAT_NEXT_PROMPT,
          ];
        }

        await context.setConversationState({
          agentMode: true,
          dialogEnded: false,
        });

        // Update conversation status in DB
        const conversationId = session.conversationState?.conversationId;
        if (conversationId) {
          await this.conversationRepository.updateStatus(
            new Types.ObjectId(conversationId),
            ConversationStatus.AGENT,
          );

          // Notify admins via WebSocket
          if (restaurantId) {
            this.chatGateway.emitConversationUpdate(restaurantId, {
              id: conversationId,
              customerPhone: session.userState?.phoneNumber || '',
              customerName: session.userState?.name || 'Customer',
              status: 'agent',
              lastMessage: 'Requested to talk to agent',
              updatedAt: new Date(),
            });
          }
        }

        result = {
          type: 'text',
          text: '🙋 You are now connected to our support team. An agent will respond to you shortly. Please wait...',
        };
        // Return early to avoid adding menu buttons
        return [result];
      default:
        result = UNKNOWN_INTENT_PROMPT;
        await context.setConversationState({ dialogEnded: true });
        break;
    }

    messages.push(result);

    const updatedSession = await context.getSession();
    if (updatedSession?.conversationState?.dialogEnded) {
      // Only add navigation buttons if the result doesn't already have buttons
      if (result.type !== 'button' && result.type !== 'list') {
        messages.push(WHAT_NEXT_PROMPT);
      }
    }

    return messages;
  }

  private resolveIntent(query: whatsappQuery): IntentName {
    const text = query.text?.trim() || '';

    // Check for list_reply type - if user selected from a list, continue browsing flow
    if (query.type === 'list_reply') {
      return 'browsing';
    }

    // Button/text based intent detection
    const lowerText = text.toLowerCase();

    // Browsing intents
    if (
      text === 'Browse Menu' ||
      lowerText.includes('shop more') ||
      lowerText.includes('browse') ||
      lowerText.includes('menu') ||
      lowerText.includes('complete order') ||
      text === 'View Cart'
    ) {
      return 'browsing';
    }

    // Tracking intent
    if (text === 'Track Order' || lowerText.includes('track')) {
      return 'tracking';
    }

    // Agent intent
    if (text === 'Talk to Agent' || lowerText.includes('agent')) {
      return 'agent';
    }

    // Greeting
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'start') {
      return 'greeting';
    }

    return 'unknown';
  }
}
