import { Module } from '@nestjs/common';
import { UserCategoriesService } from './user-categories.service';
import { UserCategoriesController } from './user-categories.controller';

@Module({
  controllers: [UserCategoriesController],
  providers: [UserCategoriesService],
  exports: [UserCategoriesService],
})
export class UserCategoriesModule {}
