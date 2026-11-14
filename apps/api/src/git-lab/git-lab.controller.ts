import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CompleteGitExerciseDto } from './dto/git-lab.dto';
import { GitLabService } from './git-lab.service';

@Controller('git-lab')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GitLabController {
  constructor(private readonly gitLabService: GitLabService) {}

  @Get('my-progress')
  getMyProgress(@Req() req: any) {
    return this.gitLabService.getMyProgress(req.user.id);
  }

  @Post('complete')
  completeExercise(@Req() req: any, @Body() dto: CompleteGitExerciseDto) {
    return this.gitLabService.completeExercise(req.user.id, dto);
  }

  @Get('students')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  getStudentsProgress(@Req() req: any) {
    return this.gitLabService.getStudentsProgress(req.user.id);
  }
}
