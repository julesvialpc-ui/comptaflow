export class CreateChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}
