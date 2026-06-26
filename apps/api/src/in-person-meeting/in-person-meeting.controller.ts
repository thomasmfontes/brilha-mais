import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Put,
  Delete,
} from '@nestjs/common';
import { InPersonMeetingService } from './in-person-meeting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('in-person-meetings')
@UseGuards(JwtAuthGuard)
export class InPersonMeetingController {
  constructor(private readonly meetingService: InPersonMeetingService) {}

  @Post('turma/:turmaId')
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  createMeeting(
    @Param('turmaId') turmaId: string,
    @Body() body: { title: string; date: string },
  ) {
    return this.meetingService.createMeeting(turmaId, body.title, body.date);
  }

  @Get('turma/:turmaId')
  getMeetingsByTurma(@Param('turmaId') turmaId: string) {
    return this.meetingService.getMeetingsByTurma(turmaId);
  }

  @Get(':id')
  getMeeting(@Param('id') id: string) {
    return this.meetingService.getMeeting(id);
  }

  @Get(':id/qr-token')
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  generateQrToken(@Param('id') id: string) {
    return this.meetingService.generateQrToken(id);
  }

  @Post('scan')
  scanQrCode(@Request() req, @Body() body: { token: string }) {
    return this.meetingService.scanQrCode(req.user.id, body.token);
  }

  @Post(':id/attendances/:userId')
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  markAttendanceManually(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.meetingService.markAttendanceManually(id, userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  updateMeeting(
    @Param('id') id: string,
    @Body() body: { title: string; date: string },
  ) {
    return this.meetingService.updateMeeting(id, body.title, body.date);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  deleteMeeting(@Param('id') id: string) {
    return this.meetingService.deleteMeeting(id);
  }
}
