import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { QuizModule } from './quiz/quiz.module';
import { CategoryModule } from './category/category.module';
import { CourseModule } from './course/course.module';
import { ProgressModule } from './progress/progress.module';
import { StatsModule } from './stats/stats.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { UploadModule } from './upload/upload.module';
import { AuditModule } from './audit/audit.module';
import { TurmaModule } from './turma/turma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    QuizModule,
    CategoryModule,
    CourseModule,
    ProgressModule,
    StatsModule,
    EnrollmentModule,
    UploadModule,
    AuditModule,
    TurmaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
