import Groq from 'groq-sdk';

export class GroqConnection {
  private static instance: Groq;

  private constructor() {}

  static getInstance(apiKey: string): Groq {
    if (!GroqConnection.instance) {
      GroqConnection.instance = new Groq({
        apiKey,
        maxRetries: 3,
        timeout: 60_000,
      });
    }
    return GroqConnection.instance;
  }
}
