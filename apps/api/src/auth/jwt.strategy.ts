import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private userCache = new Map<string, { user: any; expiresAt: number }>();

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key-donotuseinprod',
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const now = Date.now();

    // Check in-memory cache to avoid flooding DB on concurrent requests
    const cached = this.userCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        this.userCache.set(userId, { user, expiresAt: now + CACHE_TTL_MS });
        return user;
      } else {
        console.warn('User not found for ID:', userId);
        return null;
      }
    } catch (err: any) {
      console.warn('Prisma lookup warning in JwtStrategy, falling back to cached user or payload:', err.message);
      if (cached) {
        return cached.user;
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        avatarUrl: payload.avatarUrl,
      };
    }
  }
}
