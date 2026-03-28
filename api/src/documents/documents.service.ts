import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    return this.prisma.document.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    businessId: string,
    file: Express.Multer.File,
    name: string,
    category: string,
    notes?: string,
  ) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = path.extname(file.originalname) || '';
    const filename = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    const url = `${API_URL}/uploads/documents/${filename}`;

    return this.prisma.document.create({
      data: {
        businessId,
        name: name || file.originalname,
        url,
        category,
        mimeType: file.mimetype,
        size: file.size,
        notes,
      },
    });
  }

  async delete(id: string, businessId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.businessId !== businessId) throw new ForbiddenException();

    // Delete file from disk
    const filename = path.basename(new URL(doc.url).pathname);
    const filePath = path.join(process.cwd(), 'uploads', 'documents', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.document.delete({ where: { id } });
  }
}
