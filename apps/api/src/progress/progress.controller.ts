import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':courseId')
  getProgress(@Param('courseId') courseId: string, @Req() req: any) {
    return this.progressService.getProgress(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('toggle')
  toggleLessonCompletion(
    @Body() data: { lessonId: string; completed: boolean },
    @Req() req: any,
  ) {
    return this.progressService.toggleLessonCompletion(
      req.user.id,
      data.lessonId,
      data.completed,
    );
  }
}
