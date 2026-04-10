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
import { EssaySubmissionModule } from './essay-submission/essay-submission.module';
import { MaterialDownloadModule } from './material-download/material-download.module';
import { LocationModule } from './location/location.module';

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
    EssaySubmissionModule,
    MaterialDownloadModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
