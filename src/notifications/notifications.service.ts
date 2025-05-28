// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
  notification_priority: number;
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
  priority: number;
  actionUrl: string | null;
  actionText: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

@Injectable()
export class NotificationsService {
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
    // Solução 1: Converter null para undefined
    const notificationData = {
      ...createNotificationDto,
      expiresAt: createNotificationDto.expiresAt
        ? new Date(createNotificationDto.expiresAt)
        : undefined, // Mudança: null -> undefined
    };

    const notification = this.notificationsRepository.create(notificationData);
    return this.notificationsRepository.save(notification);
  }

  // Buscar notificações ativas para um usuário
  async findForUser(userId: number): Promise<UserNotificationResponse[]> {
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
  }

  // Contar notificações não lidas
  async countUnreadForUser(userId: number): Promise<number> {
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
  }

  // Marcar notificações como lidas
  async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
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
  }

  // Marcar notificação como dispensada
  async dismiss(userId: number, notificationId: number): Promise<void> {
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
  }

  // Buscar todas as notificações (admin)
  async findAll(): Promise<Notification[]> {
    return this.notificationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Buscar notificação por ID
  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return notification;
  }

  // Atualizar notificação
  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    // Aplicar todas as propriedades exceto expiresAt
    const { expiresAt, ...otherProps } = updateNotificationDto;
    Object.assign(notification, otherProps);

    // Converter expiresAt se fornecido
    if (expiresAt !== undefined) {
      notification.expiresAt =
        expiresAt && expiresAt.trim() ? new Date(expiresAt) : null;
    }

    return this.notificationsRepository.save(notification);
  }

  // Remover notificação
  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationsRepository.delete(notification.id);
  }

  // Desativar notificação
  async deactivate(id: number): Promise<Notification> {
    return this.update(id, { isActive: false });
  }
}
