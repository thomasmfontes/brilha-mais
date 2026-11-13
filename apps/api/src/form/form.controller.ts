import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Ip,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { FormService } from './form.service';
import {
  SaveFormDto,
  CreateFromTemplateDto,
  SubmitPublicFormDto,
  UpdateSubmissionTriageDto,
  EnrollSubmissionsDto,
} from './dto/form.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('forms')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FormController {
  constructor(private readonly formService: FormService) {}

  // -------------------------------------------------------------
  // PUBLIC ROUTES (No authentication required)
  // -------------------------------------------------------------

  @Get('public/featured')
  getPublicFeatured() {
    return this.formService.getPublicFeatured();
  }

  @Get('public/:slug')
  getPublicBySlug(@Param('slug') slug: string) {
    return this.formService.getPublicBySlug(slug);
  }

  @Post('public/:slug/submit')
  submitPublic(
    @Param('slug') slug: string,
    @Body() dto: SubmitPublicFormDto,
    @Ip() ip: string,
  ) {
    return this.formService.submitPublic(slug, dto, ip);
  }

  // -------------------------------------------------------------
  // ADMIN ROUTES (Role: ADMIN, SUPER_ADMIN)
  // -------------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllAdmin(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.formService.findAllAdmin(req.user, { search, status });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Req() req: any, @Body() dto: SaveFormDto) {
    return this.formService.saveForm(null, dto, req.user);
  }

  @Post('from-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createFromTemplate(@Req() req: any, @Body() dto: CreateFromTemplateDto) {
    return this.formService.createFromTemplate(dto, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string, @Req() req: any) {
    return this.formService.findOneAdmin(id, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Req() req: any, @Body() dto: SaveFormDto) {
    return this.formService.saveForm(id, dto, req.user);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  toggleActive(@Param('id') id: string, @Req() req: any) {
    return this.formService.toggleActive(id, req.user);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.formService.duplicateForm(id, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.formService.deleteForm(id, req.user);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getSubmissions(
    @Param('id') id: string,
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('fieldKey') fieldKey?: string,
    @Query('fieldValue') fieldValue?: string,
  ) {
    return this.formService.getSubmissions(id, req.user, {
      search,
      status,
      fieldKey,
      fieldValue,
    });
  }

  @Get(':id/submissions/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async exportSubmissions(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'xlsx',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('fieldKey') fieldKey?: string,
    @Query('fieldValue') fieldValue?: string,
  ) {
    const normalizedFormat = format === 'csv' ? 'csv' : 'xlsx';
    const result = await this.formService.exportSubmissions(
      id,
      req.user,
      { search, status, fieldKey, fieldValue },
      normalizedFormat,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  @Patch(':id/submissions/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateSubmissionTriage(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateSubmissionTriageDto,
    @Req() req: any,
  ) {
    return this.formService.updateSubmissionTriage(
      id,
      submissionId,
      dto,
      req.user,
    );
  }

  @Delete(':id/submissions/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteSubmission(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Req() req: any,
  ) {
    return this.formService.deleteSubmission(id, submissionId, req.user);
  }

  @Post(':id/submissions/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  enrollSubmissions(
    @Param('id') id: string,
    @Body() dto: EnrollSubmissionsDto,
    @Req() req: any,
  ) {
    return this.formService.enrollSubmissions(id, dto, req.user);
  }
}
