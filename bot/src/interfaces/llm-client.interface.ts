export interface LLMClientInterface {
  readonly name: string;
  callLLM(input: {
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }): Promise<string>;
}
