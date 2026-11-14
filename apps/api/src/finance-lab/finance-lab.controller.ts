import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdatePortfolioDto } from './dto/finance-lab.dto';
import { FinanceLabService } from './finance-lab.service';

@Controller('finance-lab')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinanceLabController {
  constructor(private readonly financeLabService: FinanceLabService) {}

  @Get('portfolios')
  getPortfolios(@Req() req: any) {
    return this.financeLabService.getPortfolios(req.user.id);
  }

  @Put('portfolios/:slug')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  updatePortfolio(
    @Req() req: any,
    @Param('slug') slug: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.financeLabService.updatePortfolio(req.user.id, slug, dto);
  }

  @Post('portfolios/:slug/reset')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  resetPortfolio(@Req() req: any, @Param('slug') slug: string) {
    return this.financeLabService.resetPortfolio(req.user.id, slug);
  }
}
