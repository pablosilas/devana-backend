// auth/dto/update-profile.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsDateString({}, { message: 'Data de nascimento deve ser uma data válida' })
  birthDate: string;

  @IsEnum(UserRole, { message: 'Função deve ser válida' })
  role: UserRole;

  @IsOptional()
  @MinLength(6, { message: 'Senha atual deve ter pelo menos 6 caracteres' })
  currentPassword?: string;

  @IsOptional()
  @MinLength(6, { message: 'Nova senha deve ter pelo menos 6 caracteres' })
  newPassword?: string;
}
