import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class MicrosoftAuthGuard extends AuthGuard('microsoft') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      prompt: 'select_account',
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) { }

  @Get('google')
  async googleAuth(@Req() req: any, @Res() res: any) {
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID === 'your-google-client-id'
    ) {
      // Bypass for local testing if no keys are provided
      console.log('Google Client ID missing. Using mock login.');
      const mockUser = {
        email: 'test-google@example.com',
        name: 'Google Tester',
        provider: 'google',
        providerId: 'mock-google-id',
      };
      const user = await this.authService.validateOAuthUser(mockUser);
      const { access_token } = await this.authService.login(user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?token=${access_token}`);
    }
    // Real OAuth flow
    return res.redirect('/auth/google/real');
  }

  @Get('google/real')
  @UseGuards(AuthGuard('google'))
  async googleAuthReal(@Req() req: any) { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    console.log('--- Google Callback Reached ---');
    console.log('User from request:', req.user ? 'Found' : 'Missing');
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?token=${access_token}`);
  }

  @Get('microsoft')
  async microsoftAuth(@Req() req: any, @Res() res: any) {
    console.log('--- AuthController: microsoftAuth hit ---');
    if (
      !process.env.MICROSOFT_CLIENT_ID ||
      process.env.MICROSOFT_CLIENT_ID === 'your-ms-client-id'
    ) {
      // Bypass for local testing if no keys are provided
      console.log('Microsoft Client ID missing. Using mock login.');
      const mockUser = {
        email: 'test-ms@example.com',
        name: 'Microsoft Tester',
        provider: 'microsoft',
        providerId: 'mock-ms-id',
      };
      const user = await this.authService.validateOAuthUser(mockUser);
      const { access_token } = await this.authService.login(user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?token=${access_token}`);
    }
    // Real OAuth flow
    return res.redirect('/auth/microsoft/real');
  }

  @Get('microsoft/real')
  @UseGuards(MicrosoftAuthGuard)
  async microsoftAuthReal(@Req() req: any) {
    console.log('--- AuthController: microsoftAuthReal (Guarded with prompt) ---');
  }

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthRedirect(@Req() req: any, @Res() res: any) {
    console.log('--- AuthController: microsoftAuthRedirect hit ---');
    console.log('User object in req:', req.user ? 'PRESENT' : 'MISSING');
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?token=${access_token}`);
  }
  /* 
  @Post('login')
  async login(@Body() body: any) {
    console.log('--- Demo Login Attempt ---', body.email);
    const { email } = body;

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a demo user if doesn't exist
      user = await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          provider: 'local',
          providerId: `local-${email}`,
          role: email.includes('admin')
            ? 'ADMIN'
            : email.includes('instrutor')
              ? 'INSTRUCTOR'
              : 'STUDENT',
        },
      });
    } else if (email.includes('admin') && user.role !== 'ADMIN') {
      // Force ADMIN for demo purposes
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    return this.authService.login(user);
  }
  */
}
