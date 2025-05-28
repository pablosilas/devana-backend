// users/users.controller.ts
import {
  Controller,
  Put,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Interface para o request autenticado
interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    type: 'user';
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ) {
    // O JwtAuthGuard garante que req.user existe e contém userId
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const updatedUser = await this.usersService.updateUserProfile(
      userId,
      updateProfileDto,
    );

    return {
      ...updatedUser,
      // Garantir que a data está no formato correto
      birthDate: updatedUser.birthDate.toISOString().split('T')[0],
    };
  }
}
