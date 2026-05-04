import { SessionStoreService } from '../session-store/session-store.service';
import {
  ConversationState,
  UserSession,
  UserState,
} from '../interfaces/session.interface';
import { MessageDispatcherService } from '../message-dispatcher/message-dispatcher.service';
import { MessageType } from '../interfaces/message.interface';
import { RestaurantCredentials } from '../interfaces/restaurant-credentials.interface';

export class BotContextService {
  constructor(
    private readonly sessionStore: SessionStoreService,
    private readonly userId: string,
    private readonly dispatcher: MessageDispatcherService,
    private readonly credentials: RestaurantCredentials,
  ) {}

  async getSession(): Promise<UserSession | null> {
    const session = await this.sessionStore.getUserSession(
      this.userId,
      this.credentials.phoneNumberId,
    );
    return session;
  }

  async setUserState(userState: UserState): Promise<void> {
    const session: UserSession = (await this.getSession()) || {
      userState: { name: '', phoneNumber: '' },
      conversationState: {},
    };
    session.userState = userState;
    await this.sessionStore.setUserSession(
      this.userId,
      this.credentials.phoneNumberId,
      session,
    );
  }

  async setConversationState(
    conversationState: ConversationState,
  ): Promise<void> {
    const session: UserSession = (await this.getSession()) || {
      userState: { name: '', phoneNumber: '' },
      conversationState: {},
    };
    session.conversationState = {
      ...session.conversationState,
      ...conversationState,
    };
    await this.sessionStore.setUserSession(
      this.userId,
      this.credentials.phoneNumberId,
      session,
    );
  }

  async clearConversation(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.conversationState = {
        intentName: undefined,
        step: undefined,
        dialogEnded: true,
        payload: {},
      };
      await this.sessionStore.setUserSession(
        this.userId,
        this.credentials.phoneNumberId,
        session,
      );
    }
  }

  async send(message: MessageType): Promise<void> {
    await this.dispatcher.dispatchMessage(
      message,
      this.userId,
      this.credentials,
    );
  }
}
