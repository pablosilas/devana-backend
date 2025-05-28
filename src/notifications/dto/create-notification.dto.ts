// src/notifications/dto/create-notification.dto.ts
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
  title: string;

  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  message: string;

  @IsEnum(NotificationType, { message: 'Tipo de notificação inválido' })
  type: NotificationType;

  @IsEnum(NotificationPriority, { message: 'Prioridade inválida' })
  priority: NotificationPriority;

  @IsOptional()
  @IsDateString({}, { message: 'Data de expiração deve ser válida' })
  expiresAt?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL de ação deve ser válida' })
  actionUrl?: string;

  @IsOptional()
  @MaxLength(50, { message: 'Texto da ação deve ter no máximo 50 caracteres' })
  actionText?: string;
}
