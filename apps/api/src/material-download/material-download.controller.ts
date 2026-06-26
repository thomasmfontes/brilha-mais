import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MaterialDownloadService } from './material-download.service';
import { RecordDownloadDto } from './dto/record-download.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('material-downloads')
@UseGuards(JwtAuthGuard)
export class MaterialDownloadController {
  constructor(private readonly service: MaterialDownloadService) {}

  /** Called by students/all users when they download a file */
  @Post()
  record(@Req() req: any, @Body() dto: RecordDownloadDto) {
    return this.service.record(req.user.id, dto);
  }

  /**
   * GET /material-downloads?lessonId=X
   * Returns all downloads for a lesson (instructor/admin only, enforced on FE via role check)
   * Optionally filter by materialUrl to get who downloaded a specific file
   */
  @Get()
  getByLesson(
    @Query('lessonId') lessonId: string,
    @Query('materialUrl') materialUrl?: string,
  ) {
    return this.service.getDownloadsByLesson(lessonId, materialUrl);
  }

  /**
   * GET /material-downloads/counts?lessonId=X
   * Returns download counts per material file for a lesson
   */
  @Get('counts')
  getCounts(@Query('lessonId') lessonId: string) {
    return this.service.getCountsByLesson(lessonId);
  }
}
