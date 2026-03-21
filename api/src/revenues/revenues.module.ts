import { Module } from '@nestjs/common';
import { RevenuesController } from './revenues.controller';
import { RevenuesService } from './revenues.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RevenuesController],
  providers: [RevenuesService],
})
export class RevenuesModule {}
