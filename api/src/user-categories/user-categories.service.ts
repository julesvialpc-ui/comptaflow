import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserCategoryDto } from './dto/create-user-category.dto';
import { UpdateUserCategoryDto } from './dto/update-user-category.dto';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class UserCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(businessId: string, type?: string) {
    return this.prisma.userCategory.findMany({
      where: {
        businessId,
        ...(type && { type }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(businessId: string, dto: CreateUserCategoryDto) {
    const slug = toSlug(dto.name);
    return this.prisma.userCategory.create({
      data: {
        businessId,
        name: dto.name,
        slug,
        color: dto.color ?? '#378ADD',
        type: dto.type,
      },
    });
  }

  async update(id: string, businessId: string, dto: UpdateUserCategoryDto) {
    const cat = await this.prisma.userCategory.findFirst({ where: { id } });
    if (!cat) throw new NotFoundException(`UserCategory ${id} not found`);
    if (cat.businessId !== businessId) throw new ForbiddenException();

    const data: { name?: string; slug?: string; color?: string } = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = toSlug(dto.name);
    }
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.userCategory.update({ where: { id }, data });
  }

  async remove(id: string, businessId: string) {
    const cat = await this.prisma.userCategory.findFirst({ where: { id } });
    if (!cat) throw new NotFoundException(`UserCategory ${id} not found`);
    if (cat.businessId !== businessId) throw new ForbiddenException();
    return this.prisma.userCategory.delete({ where: { id } });
  }
}
