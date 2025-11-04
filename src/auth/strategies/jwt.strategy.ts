import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number; // user.id (internal)
  publicId: string; // user.publicId (UUID)
  email: string;
  tenantId: number; // Multi-tenant
  role: string; // UserRole
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Este objeto se adjunta a request.user
    return {
      userId: payload.sub,
      publicId: payload.publicId,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
