import { IsNotEmpty, MaxLength } from 'class-validator';

export class GuestAccessDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;
}
