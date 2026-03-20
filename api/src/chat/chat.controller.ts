import { Controller, Get, Post, Delete, Body, Query, Res, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AiChatService } from './ai-chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly aiChatService: AiChatService,
  ) {}

  // ─── History ──────────────────────────────────────────────────────────────

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.chatService.getHistory(user.id, limit ? parseInt(limit) : 50);
  }

  @Delete('history')
  clearHistory(@CurrentUser() user: AuthUser) {
    return this.chatService.clearHistory(user.id);
  }

  // ─── Manual message (store only, no AI) ──────────────────────────────────

  @Post('message')
  create(@Body() dto: CreateChatMessageDto, @CurrentUser() user: AuthUser) {
    return this.chatService.create(dto, user.id);
  }

  // ─── AI Chat (full response) ──────────────────────────────────────────────

  @Post('ai')
  async sendToAi(@Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    if (!dto.message?.trim()) throw new ForbiddenException('Message vide');
    const text = await this.aiChatService.sendMessage(user.id, user.businessId, dto.message);
    return { response: text };
  }

  // ─── AI Chat (SSE streaming) ──────────────────────────────────────────────

  @Post('ai/stream')
  async streamToAi(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
    @Res() res: any,
  ) {
    if (!dto.message?.trim()) {
      res.status(400).json({ message: 'Message vide' });
      return;
    }
    await this.aiChatService.streamMessage(user.id, user.businessId, dto.message, res);
  }
}
