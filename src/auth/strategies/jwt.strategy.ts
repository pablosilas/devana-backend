// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: number;
  email?: string;
  sessionId?: string;
  type: 'user' | 'guest';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'fallback-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'user') {
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }
      return { userId: user.id, email: user.email, type: 'user' };
    } else if (payload.type === 'guest') {
      if (!payload.sessionId) {
        throw new UnauthorizedException(
          'SessionId é obrigatório para convidados',
        );
      }

      const guest = await this.usersService.findGuestBySessionId(
        payload.sessionId,
      );
      if (!guest) {
        throw new UnauthorizedException();
      }
      return { guestId: guest.id, sessionId: guest.sessionId, type: 'guest' };
    }

    throw new UnauthorizedException();
  }
}
