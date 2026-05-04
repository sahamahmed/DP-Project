export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMPayload {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
  };
  metadata?: Record<string, any>;
}
