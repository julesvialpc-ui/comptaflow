import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  getHistory(userId: string, limit = 50) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  create(dto: CreateChatMessageDto, userId: string) {
    return this.prisma.chatMessage.create({
      data: { ...dto, userId, metadata: dto.metadata as object },
    });
  }

  clearHistory(userId: string) {
    return this.prisma.chatMessage.deleteMany({ where: { userId } });
  }
}
