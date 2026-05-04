import { BotContextService } from '../bot-context/bot-context.service';
import { MessageType } from '../interfaces/message.interface';

export async function asyncHandler<T>(
  context: BotContextService,
  fn: () => Promise<T>,
  fallbackMessage = 'It seems like we ran into an issue. Please try again later. Sorry for the inconvenience 😞.',
): Promise<T | MessageType> {
  try {
    return await fn();
  } catch (error) {
    console.error('Dialog step error:', error);
    await context.setConversationState({
      step: undefined,
      dialogEnded: true,
    });
    return {
      type: 'text',
      text: fallbackMessage,
    };
  }
}
