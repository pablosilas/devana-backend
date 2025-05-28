// src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { UserNotification } from './entities/user-notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

interface NotificationRawResult {
  notification_id: number;
  notification_title: string;
  notification_message: string;
  notification_type: string;
  notification_priority: string;
  notification_actionUrl: string | null;
  notification_actionText: string | null;
  notification_createdAt: Date;
  isRead: boolean | number;
  isDismissed: boolean | number;
}

export interface UserNotificationResponse {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl: string | null;
  actionText: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(UserNotification)
    private userNotificationsRepository: Repository<UserNotification>,
  ) {}

  // Criar nova notificação (admin only)
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      const notificationData = {
        ...createNotificationDto,
        expiresAt: createNotificationDto.expiresAt
          ? new Date(createNotificationDto.expiresAt)
          : undefined,
      };

      const notification =
        this.notificationsRepository.create(notificationData);
      const savedNotification =
        await this.notificationsRepository.save(notification);

      this.logger.log(
        `Notificação criada: ${savedNotification.title} (ID: ${savedNotification.id})`,
      );
      return savedNotification;
    } catch (error) {
      this.logger.error('Erro ao criar notificação:', error);
      throw new InternalServerErrorException('Erro ao criar notificação');
    }
  }

  // Buscar notificações ativas para um usuário
  async findForUser(userId: number): Promise<UserNotificationResponse[]> {
    try {
      const activeNotifications = await this.notificationsRepository
        .createQueryBuilder('notification')
        .leftJoin(
          'user_notifications',
          'un',
          'un.notificationId = notification.id AND un.userId = :userId',
          { userId },
        )
        .select([
          'notification.id',
          'notification.title',
          'notification.message',
          'notification.type',
          'notification.priority',
          'notification.actionUrl',
          'notification.actionText',
          'notification.createdAt',
          'COALESCE(un.isRead, false) as isRead',
          'COALESCE(un.isDismissed, false) as isDismissed',
        ])
        .where('notification.isActive = :isActive', { isActive: true })
        .andWhere(
          '(notification.expiresAt IS NULL OR notification.expiresAt > :now)',
          { now: new Date() },
        )
        .andWhere('(un.isDismissed IS NULL OR un.isDismissed = false)')
        .orderBy('notification.priority', 'DESC')
        .addOrderBy('notification.createdAt', 'DESC')
        .getRawMany<NotificationRawResult>();

      return activeNotifications.map(
        (notification): UserNotificationResponse => ({
          id: notification.notification_id,
          title: notification.notification_title,
          message: notification.notification_message,
          type: notification.notification_type,
          priority: notification.notification_priority,
          actionUrl: notification.notification_actionUrl,
          actionText: notification.notification_actionText,
          createdAt: notification.notification_createdAt,
          isRead: Boolean(notification.isRead),
          isDismissed: Boolean(notification.isDismissed),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar notificações para usuário ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Erro ao buscar notificações');
    }
  }

  // Contar notificações não lidas
  async countUnreadForUser(userId: number): Promise<number> {
    try {
      const result = await this.notificationsRepository
        .createQueryBuilder('notification')
        .leftJoin(
          'user_notifications',
          'un',
          'un.notificationId = notification.id AND un.userId = :userId',
          { userId },
        )
        .where('notification.isActive = :isActive', { isActive: true })
        .andWhere(
          '(notification.expiresAt IS NULL OR notification.expiresAt > :now)',
          { now: new Date() },
        )
        .andWhere('(un.isRead IS NULL OR un.isRead = false)')
        .andWhere('(un.isDismissed IS NULL OR un.isDismissed = false)')
        .getCount();

      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao contar notificações para usuário ${userId}:`,
        error,
      );
      return 0; // Retornar 0 em caso de erro
    }
  }

  // Marcar notificações como lidas
  async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
    try {
      for (const notificationId of notificationIds) {
        await this.userNotificationsRepository
          .createQueryBuilder()
          .insert()
          .into(UserNotification)
          .values({
            userId,
            notificationId,
            isRead: true,
          })
          .orUpdate(['isRead'], ['userId', 'notificationId'])
          .execute();
      }

      this.logger.log(
        `Usuário ${userId} marcou ${notificationIds.length} notificações como lidas`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao marcar notificações como lidas para usuário ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Erro ao marcar notificações como lidas',
      );
    }
  }

  // Marcar notificação como dispensada
  async dismiss(userId: number, notificationId: number): Promise<void> {
    try {
      await this.userNotificationsRepository
        .createQueryBuilder()
        .insert()
        .into(UserNotification)
        .values({
          userId,
          notificationId,
          isDismissed: true,
        })
        .orUpdate(['isDismissed'], ['userId', 'notificationId'])
        .execute();

      this.logger.log(
        `Usuário ${userId} dispensou notificação ${notificationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao dispensar notificação ${notificationId} para usuário ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Erro ao dispensar notificação');
    }
  }

  // Buscar todas as notificações (admin)
  async findAll(): Promise<Notification[]> {
    try {
      const notifications = await this.notificationsRepository.find({
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`Buscadas ${notifications.length} notificações (admin)`);
      return notifications;
    } catch (error) {
      this.logger.error('Erro ao buscar todas as notificações:', error);
      throw new InternalServerErrorException('Erro ao buscar notificações');
    }
  }

  // Buscar notificação por ID
  async findOne(id: number): Promise<Notification> {
    try {
      const notification = await this.notificationsRepository.findOne({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException('Notificação não encontrada');
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar notificação ${id}:`, error);
      throw new InternalServerErrorException('Erro ao buscar notificação');
    }
  }

  // Atualizar notificação
  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = await this.findOne(id);

      // Aplicar todas as propriedades exceto expiresAt
      const { expiresAt, ...otherProps } = updateNotificationDto;
      Object.assign(notification, otherProps);

      // Converter expiresAt se fornecido
      if (expiresAt !== undefined) {
        notification.expiresAt =
          expiresAt && expiresAt.trim() ? new Date(expiresAt) : null;
      }

      const updatedNotification =
        await this.notificationsRepository.save(notification);
      this.logger.log(`Notificação ${id} atualizada`);

      return updatedNotification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar notificação ${id}:`, error);
      throw new InternalServerErrorException('Erro ao atualizar notificação');
    }
  }

  // Remover notificação
  async remove(id: number): Promise<void> {
    try {
      const notification = await this.findOne(id);
      await this.notificationsRepository.delete(notification.id);
      this.logger.log(`Notificação ${id} removida`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover notificação ${id}:`, error);
      throw new InternalServerErrorException('Erro ao remover notificação');
    }
  }

  // Desativar notificação
  async deactivate(id: number): Promise<Notification> {
    try {
      const result = await this.update(id, { isActive: false });
      this.logger.log(`Notificação ${id} desativada`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao desativar notificação ${id}:`, error);
      throw error; // Propagar o erro já tratado no update
    }
  }
}
