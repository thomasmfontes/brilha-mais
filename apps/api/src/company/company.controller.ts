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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  ActivateCompanyDto,
  UpdateCandidateStageDto,
} from './dto/company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // -------------------------------------------------------------
  // PUBLIC / INVITATION / AUTH
  // -------------------------------------------------------------

  @Get('company/invitation/:token')
  async validateInvitation(@Param('token') token: string) {
    return this.companyService.validateInvitation(token);
  }

  @Post('company/activate')
  async activateCompany(@Body() dto: ActivateCompanyDto, @Ip() ip: string) {
    return this.companyService.activateCompany(dto, ip);
  }

  @Post('company/login')
  async loginCompany(@Body() body: { email: string; password?: string }) {
    return this.companyService.loginCompany(body);
  }

  // -------------------------------------------------------------
  // COMPANY PORTAL ROUTES (Role: COMPANY)
  // -------------------------------------------------------------

  @Get('company/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async getMyProfile(@Req() req: any) {
    return this.companyService.getCompanyProfileForUser(req.user.id);
  }

  @Get('company/talents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async getTalentsForCompany(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('area') area?: string,
    @Query('availability') availability?: string,
    @Query('city') city?: string,
  ) {
    return this.companyService.findTalentsForCompany(req.user.id, {
      search,
      area,
      availability,
      city,
    });
  }

  @Get('company/talents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async getTalentDetails(
    @Req() req: any,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.companyService.getTalentDetailsForCompany(req.user.id, id, ip);
  }

  @Get('company/talents/:id/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async downloadResume(
    @Req() req: any,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.companyService.recordResumeDownload(req.user.id, id, ip);
  }

  @Put('company/talents/:id/stage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async updateCandidateStage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateStageDto,
  ) {
    return this.companyService.updateCandidateStage(req.user.id, id, dto);
  }

  @Get('company/pipeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  async getPipeline(@Req() req: any) {
    return this.companyService.getPipeline(req.user.id);
  }

  // -------------------------------------------------------------
  // ADMIN DASHBOARD ROUTES (Role: ADMIN, SUPER_ADMIN)
  // -------------------------------------------------------------

  @Get('companies/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getStats() {
    return this.companyService.getStatsForAdmin();
  }

  @Get('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.companyService.findAllForAdmin({ search, status });
  }

  @Post('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Req() req: any, @Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto, req.user);
  }

  @Get('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.companyService.findOneForAdmin(id);
  }

  @Patch('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, dto, req.user);
  }

  @Delete('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.companyService.remove(id, req.user);
  }

  @Post('companies/:id/reissue-invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async reissueInvite(@Req() req: any, @Param('id') id: string) {
    return this.companyService.reissueInvite(id, req.user);
  }
}
