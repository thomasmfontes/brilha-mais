/* eslint-disable */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { WebAuthnService } from './webauthn.service';
import { Request } from 'express';
import { User } from '@prisma/client';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

interface RequestWithUser extends Request {
  user: User;
}

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
    private webAuthnService: WebAuthnService,
  ) {}

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
  async googleAuthReal(@Req() req: any) {}

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
    console.log(
      '--- AuthController: microsoftAuthReal (Guarded with prompt) ---',
    );
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

  @Post('webauthn/register/options')
  @UseGuards(JwtAuthGuard)
  async registerOptions(@Req() req: RequestWithUser) {
    return this.webAuthnService.getRegistrationOptions(req.user);
  }

  @Post('webauthn/register/verify')
  @UseGuards(JwtAuthGuard)
  async registerVerify(
    @Req() req: RequestWithUser,
    @Body() body: RegistrationResponseJSON & { deviceName?: string; name?: string },
  ) {
    return this.webAuthnService.verifyRegistration(req.user, body);
  }

  @Post('webauthn/authenticate/options')
  async authenticateOptions(@Body() body: { email?: string }) {
    return this.webAuthnService.getAuthenticationOptions(body);
  }

  @Post('webauthn/authenticate/verify')
  async authenticateVerify(
    @Body() body: AuthenticationResponseJSON & { challenge?: string },
  ) {
    return this.webAuthnService.verifyAuthentication(body);
  }

  @Get('webauthn/credentials')
  @UseGuards(JwtAuthGuard)
  async getCredentials(@Req() req: RequestWithUser) {
    return this.webAuthnService.getCredentials(req.user);
  }

  @Delete('webauthn/credentials/:id')
  @UseGuards(JwtAuthGuard)
  async deleteCredential(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.webAuthnService.deleteCredential(req.user, id);
  }
}
