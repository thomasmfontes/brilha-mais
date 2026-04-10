import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly jwtService: JwtService
  ) { }

  private extractUserId(req: any): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.decode(token) as any;
        return payload?.sub;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  @UseGuards(JwtAuthGuard)
  @Get('instructor')
  getInstructorCourses(@Req() req: any) {
    return this.courseService.findByInstructor(req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/students')
  getCourseStudents(@Param('id') id: string, @Req() req: any) {
    return this.courseService.findStudentsByCourse(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/students/:studentId/progress')
  getCourseStudentProgress(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Req() req: any
  ) {
    return this.courseService.getCourseStudentProgress(id, studentId, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/lessons/:lessonId/students')
  getLessonStudentsProgress(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Req() req: any
  ) {
    return this.courseService.getLessonStudentsProgress(id, lessonId, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyCourses(@Req() req: any) {
    return this.courseService.findEnrolled(req.user.id);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = this.extractUserId(req);
    // If not logged in, return global courses
    if (!userId) {
      return this.courseService.findAll();
    }
    return this.courseService.findAll(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/list')
  getAdminCourses(@Req() req: any) {
    return this.courseService.findAdminCourses(req.user.locationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = this.extractUserId(req);
    return this.courseService.findOne(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() data: any) {
    // If admin has a location, force it. Otherwise, use what was sent or null (global).
    const locationId = req.user.locationId || data.locationId;
    return this.courseService.create({ ...data, instructorId: req.user.id, locationId });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.courseService.update(id, data, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.courseService.delete(id, req.user.id);
  }
}
