import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';

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
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
