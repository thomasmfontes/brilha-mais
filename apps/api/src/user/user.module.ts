import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { StudentMaterialService } from './student-material.service';
import { PrismaService } from '../prisma.service';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [CategoryModule],
  controllers: [UserController],
  providers: [UserService, StudentMaterialService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
