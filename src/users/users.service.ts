import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Guest } from './entities/guest.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { GuestAccessDto } from '../auth/dto/guest.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Guest)
    private guestsRepository: Repository<Guest>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createUser(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
      birthDate: new Date(registerDto.birthDate),
    });

    return this.usersRepository.save(user);
  }

  async updateUserProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o email já existe (e não é do próprio usuário)
    if (updateProfileDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateProfileDto.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email já está em uso por outro usuário');
      }
    }

    // Se foi fornecida senha atual, verificar e atualizar
    if (updateProfileDto.currentPassword && updateProfileDto.newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(
        updateProfileDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(
        updateProfileDto.newPassword,
        12,
      );
      user.password = hashedNewPassword;
    }

    // Atualizar outros campos
    user.name = updateProfileDto.name;
    user.email = updateProfileDto.email;
    user.birthDate = new Date(updateProfileDto.birthDate);
    user.role = updateProfileDto.role;

    const updatedUser = await this.usersRepository.save(user);

    // Retornar sem a senha
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      birthDate: updatedUser.birthDate,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    } as User;
  }

  async createGuest(guestDto: GuestAccessDto): Promise<Guest> {
    const sessionId = uuidv4();

    const guest = this.guestsRepository.create({
      name: guestDto.name,
      sessionId,
    });

    return this.guestsRepository.save(guest);
  }

  async findGuestBySessionId(sessionId: string): Promise<Guest | null> {
    return this.guestsRepository.findOne({ where: { sessionId } });
  }
}
