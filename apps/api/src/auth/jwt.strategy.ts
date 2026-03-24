import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key-donotuseinprod',
    });
  }

  async validate(payload: any) {
    console.log('--- JWT Strategy Validate ---', payload.sub);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) console.warn('User not found for ID:', payload.sub);
    return user;
  }
}
