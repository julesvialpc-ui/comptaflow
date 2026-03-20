import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!business) throw new NotFoundException(`Business ${id} not found`);
    return business;
  }

  findByUser(userId: string) {
    return this.prisma.business.findUnique({ where: { userId } });
  }

  create(dto: CreateBusinessDto) {
    return this.prisma.business.create({ data: dto });
  }

  async update(id: string, userId: string, dto: UpdateBusinessDto) {
    const business = await this.findOne(id);
    if (business.userId !== userId) throw new ForbiddenException();
    return this.prisma.business.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const business = await this.findOne(id);
    if (business.userId !== userId) throw new ForbiddenException();
    return this.prisma.business.delete({ where: { id } });
  }
}
