import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private audit: AuditService,
  ) { }

  async validateOAuthUser(profile: any) {
    const { email, firstName, lastName, picture, provider, providerId } =
      profile;

    console.log(`--- validateOAuthUser [${provider}]: ${email} ---`);

    try {
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log(`Creating new user for ${email}`);
        user = await this.prisma.user.create({
          data: {
            email,
            name: [firstName, lastName].filter(Boolean).join(' '),
            avatarUrl: picture,
            provider,
            providerId,
            role: 'STUDENT',
          },
        });
      } else {
        console.log(`Updating existing user ${user.id}`);
        // Update provider info if it changed
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider,
            providerId,
            ...(picture ? { avatarUrl: picture } : {}),
          },
        });
      }

      return user;
    } catch (error) {
      console.error('--- ERROR in validateOAuthUser ---');
      console.error(error);
      throw error;
    }
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      avatarUrl: user.avatarUrl,
      hasSeenWelcomeVideo: user.hasSeenWelcomeVideo,
    };

    await this.audit.log(
      'Login',
      'Usuário',
      user.id,
      user.id,
      { email: user.email }
    );

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
