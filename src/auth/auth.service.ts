import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GuestAccessDto } from './dto/guest.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'user',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        birthDate: user.birthDate,
      },
      type: 'user',
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      const user = await this.usersService.createUser(registerDto);

      const payload = {
        sub: user.id,
        email: user.email,
        type: 'user',
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          birthDate: user.birthDate,
        },
        type: 'user',
      };
    } catch (error) {
      // Tratamento seguro do erro
      if (error instanceof ConflictException) {
        throw error; // Re-throw ConflictExceptions do UsersService
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';
      throw new BadRequestException(errorMessage);
    }
  }

  async guestAccess(guestDto: GuestAccessDto) {
    const guest = await this.usersService.createGuest(guestDto);

    const payload = {
      sub: guest.id,
      sessionId: guest.sessionId,
      type: 'guest',
    };

    return {
      access_token: this.jwtService.sign(payload),
      guest: {
        id: guest.id,
        name: guest.name,
        sessionId: guest.sessionId,
      },
      type: 'guest',
    };
  }
}
