import { MessageType } from '../interfaces/message.interface';

/**
 * Main menu button options used throughout the bot
 */
export const MAIN_MENU_BUTTONS = [
  'Browse Menu',
  'Track Order',
  'Talk to Agent',
] as const;

/**
 * "What would you like to do next?" prompt shown after dialog completion
 */
export const WHAT_NEXT_PROMPT: MessageType = {
  type: 'button',
  headerText: 'What would you like to do next?',
  bodyText: 'Please select an option below:',
  buttons: [...MAIN_MENU_BUTTONS],
};

/**
 * Helper function to create greeting messages for a user
 * Returns two messages: 1) Image with welcome text, 2) Button with options
 */
export function createGreetingMessages(
  userName: string,
  restaurantName: string,
  restaurantImageUrl: string,
): MessageType[] {
  const imageMessage: MessageType = {
    type: 'image',
    url: restaurantImageUrl,
    caption: `Hello ${userName} 👋\nWelcome to ${restaurantName}! 🍽️`,
  };

  const buttonMessage: MessageType = {
    type: 'button',
    bodyText: `We're delighted to serve you. What would you like to do today?\n\n💡 _Type Menu anytime to return to main menu_`,
    buttons: [...MAIN_MENU_BUTTONS],
  };

  return [imageMessage, buttonMessage];
}

/**
 * Fallback message when intent is not understood
 */
export const UNKNOWN_INTENT_PROMPT: MessageType = {
  type: 'button',
  headerText: 'How can I help you?',
  bodyText: `I didn't quite understand that. Please select an option below:`,
  buttons: [...MAIN_MENU_BUTTONS],
};

/**
 * Message shown when agent returns conversation to bot
 */
export const RETURNED_TO_BOT_PROMPT: MessageType = {
  type: 'button',
  headerText: 'Back to Bot 🤖',
  bodyText: 'Our agent has ended the chat. How else can I help you today?',
  buttons: [...MAIN_MENU_BUTTONS],
};
