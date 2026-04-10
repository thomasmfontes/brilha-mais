import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Delete,
  Req,
  Patch,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { StudentMaterialService } from './student-material.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly materialService: StudentMaterialService
  ) { }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Req() req: any) {
    // If Admin has a location, limit search to that location.
    // If Admin has NO location (Super Admin), show everything.
    const locationId = req.user.locationId;
    return this.userService.findAll(locationId);
  }

  @Get('me')
  getMe(@Req() req: any) {
    return this.userService.findOne(req.user.id);
  }

  @Put(':id/role')
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body('role') role: any, @Req() req: any) {
    return this.userService.updateRole(id, role, req.user.id);
  }

  @Put(':id/name')
  @Roles(Role.ADMIN)
  updateName(@Param('id') id: string, @Body('name') name: string, @Req() req: any) {
    return this.userService.updateName(id, name, req.user.id);
  }

  @Post(':id/instructor-areas')
  @Roles(Role.ADMIN)
  assignInstructorArea(
    @Param('id') id: string,
    @Body('categoryId') categoryId: string,
    @Req() req: any,
  ) {
    return this.userService.assignInstructorArea(id, categoryId, req.user.id);
  }


  @Delete(':id/instructor-areas/:categoryId')
  @Roles(Role.ADMIN)
  removeInstructorArea(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.userService.removeInstructorArea(id, categoryId);
  }


  @Put(':id/areas')
  @Roles(Role.ADMIN)
  syncAreas(
    @Param('id') id: string,
    @Body('instructorAreaIds') instructorAreaIds: string[],
    @Req() req: any,
  ) {
    return this.userService.syncAreas(id, instructorAreaIds, req.user.id);
  }

  @Put(':id/turmas')
  @Roles(Role.ADMIN)
  syncTurmas(
    @Param('id') id: string,
    @Body('turmaIds') turmaIds: string[],
    @Req() req: any,
  ) {
    return this.userService.syncTurmas(id, turmaIds, req.user.id);
  }

  @Put(':id/location')
  @Roles(Role.ADMIN)
  updateLocation(
    @Param('id') id: string,
    @Body('locationId') locationId: string | null,
    @Req() req: any,
  ) {
    return this.userService.updateLocation(id, locationId, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.userService.remove(id, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateAnyUser(@Param('id') id: string, @Body() data: { name?: string; avatarUrl?: string }, @Req() req: any) {
    return this.userService.updateProfile(id, data, req.user.id);
  }

  @Patch('me/welcome-video')
  markWelcomeVideoAsSeen(@Req() req: any) {
    return this.userService.markWelcomeVideoAsSeen(req.user.id);
  }

  @Patch('me')
  updateMe(@Req() req: any, @Body() data: { name?: string; avatarUrl?: string }) {
    return this.userService.updateProfile(req.user.id, data);
  }

  // --- Student Materials ---

  @Get(':id/materials')
  @Roles(Role.ADMIN)
  findMaterials(@Param('id') id: string) {
    return this.materialService.findAll(id);
  }

  @Post(':id/materials')
  @Roles(Role.ADMIN)
  createMaterial(
    @Param('id') id: string,
    @Body() data: { name: string; url: string; type: string; size?: string },
    @Req() req: any
  ) {
    return this.materialService.create({ ...data, userId: id }, req.user.id);
  }

  @Delete(':id/materials/:materialId')
  @Roles(Role.ADMIN)
  removeMaterial(
    @Param('materialId') materialId: string,
    @Req() req: any
  ) {
    return this.materialService.remove(materialId, req.user.id);
  }

  @Get(':id/materials/:materialId/download')
  async downloadMaterial(
    @Param('materialId') materialId: string,
    @Res() res: any,
  ) {
    const material = await this.materialService.findOne(materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const filePath = require('path').join(process.cwd(), material.url);
    
    // Set content disposition to attachment with original filename
    res.download(filePath, material.name);
  }
}
