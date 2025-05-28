import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GuestAccessDto } from './dto/guest.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('guest')
  async guestAccess(@Body(ValidationPipe) guestDto: GuestAccessDto) {
    return this.authService.guestAccess(guestDto);
  }
}
