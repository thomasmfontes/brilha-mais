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
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(req: any): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.decode(token);
        return payload?.sub;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.categoryService.findAll(userId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() data: { name: string; icon?: string; locationId?: string },
    @Req() req: any,
  ) {
    // If admin has a location, force it. Otherwise, use what was sent or null (global).
    const locationId = req.user.locationId || data.locationId;
    return this.categoryService.create(
      data.name,
      data.icon,
      locationId,
      req.user.id,
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() data: { name: string; icon?: string },
  ) {
    return this.categoryService.update(id, data.name, data.icon);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.categoryService.delete(id, req.user.id);
  }
}
