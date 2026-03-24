import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuizService } from './quiz.service';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('lesson/:lessonId')
  create(@Param('lessonId') lessonId: string, @Body() data: any) {
    return this.quizService.createQuiz(lessonId, data);
  }

  @Get('lesson/:lessonId')
  getByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.getQuizByLesson(lessonId);
  }
}
