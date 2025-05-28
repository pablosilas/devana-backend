import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsDateString({}, { message: 'Data de nascimento deve ser uma data válida' })
  birthDate: string;

  @IsEnum(UserRole, { message: 'Função deve ser válida' })
  role: UserRole;
}
