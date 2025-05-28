// src/notifications/dto/update-notification.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from './create-notification.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsOptional()
  @IsBoolean({ message: 'Status deve ser verdadeiro ou falso' })
  isActive?: boolean;
}

// src/notifications/dto/mark-read.dto.ts
import { IsArray, IsNumber } from 'class-validator';

export class MarkReadDto {
  @IsArray({ message: 'IDs devem ser um array' })
  @IsNumber({}, { each: true, message: 'Cada ID deve ser um número' })
  notificationIds: number[];
}
