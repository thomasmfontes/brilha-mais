import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-key-donotuseinprod',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [CourseController],
  providers: [CourseService, PrismaService],
  exports: [CourseService],
})
export class CourseModule {}
