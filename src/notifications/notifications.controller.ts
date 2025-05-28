// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ValidationPipe,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  UpdateNotificationDto,
  MarkReadDto,
} from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId?: number;
    guestId?: number;
    email?: string;
    type: 'user' | 'guest';
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ========== ROTAS PARA USUÁRIOS ==========

  // Buscar notificações para o usuário logado
  @Get()
  async findForUser(@Request() req: AuthenticatedRequest) {
    // Convidados não recebem notificações personalizadas
    if (req.user.type === 'guest') {
      return [];
    }

    const userId = req.user.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    return this.notificationsService.findForUser(userId);
  }

  // Contar notificações não lidas
  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    if (req.user.type === 'guest') {
      return { count: 0 };
    }

    const userId = req.user.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const count = await this.notificationsService.countUnreadForUser(userId);
    return { count };
  }

  // Marcar notificações como lidas
  @Post('mark-read')
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Body(ValidationPipe) markReadDto: MarkReadDto,
  ) {
    if (req.user.type === 'guest') {
      return { message: 'Convidados não podem marcar notificações' };
    }

    const userId = req.user.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    await this.notificationsService.markAsRead(
      userId,
      markReadDto.notificationIds,
    );
    return { message: 'Notificações marcadas como lidas' };
  }

  // Dispensar notificação
  @Post(':id/dismiss')
  async dismiss(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (req.user.type === 'guest') {
      return { message: 'Convidados não podem dispensar notificações' };
    }

    const userId = req.user.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    await this.notificationsService.dismiss(userId, id);
    return { message: 'Notificação dispensada' };
  }

  // ========== ROTAS ADMINISTRATIVAS ==========

  // Verificar se usuário é admin (para frontend)
  @Get('admin/check')
  @UseGuards(AdminGuard)
  checkAdmin(@Request() req: AuthenticatedRequest) {
    return {
      isAdmin: true,
      email: req.user.email,
      message: 'Acesso administrativo confirmado',
    };
  }

  // Criar nova notificação (admin only)
  @Post('admin')
  @UseGuards(AdminGuard)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body(ValidationPipe) createNotificationDto: CreateNotificationDto,
  ) {
    const notification = await this.notificationsService.create(
      createNotificationDto,
    );

    return {
      ...notification,
      createdBy: req.user.email, // Incluir quem criou
    };
  }

  // Listar todas as notificações (admin only)
  @Get('admin/all')
  @UseGuards(AdminGuard)
  async findAll() {
    return this.notificationsService.findAll();
  }

  // CORREÇÃO: Estatísticas das notificações (admin only) - SEM ParseIntPipe
  @Get('admin/stats')
  @UseGuards(AdminGuard)
  async getStats() {
    const allNotifications = await this.notificationsService.findAll();

    const stats = {
      total: allNotifications.length,
      active: allNotifications.filter((n) => n.isActive).length,
      inactive: allNotifications.filter((n) => !n.isActive).length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      recent: allNotifications.filter((n) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(n.createdAt) > weekAgo;
      }).length,
    };

    // Estatísticas por tipo
    allNotifications.forEach((notification) => {
      stats.byType[notification.type] =
        (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] =
        (stats.byPriority[notification.priority] || 0) + 1;
    });

    return stats;
  }

  // Buscar notificação específica (admin only)
  @Get('admin/:id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOne(id);
  }

  // Atualizar notificação (admin only)
  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateNotificationDto: UpdateNotificationDto,
  ) {
    const notification = await this.notificationsService.update(
      id,
      updateNotificationDto,
    );

    return {
      ...notification,
      updatedBy: req.user.email, // Incluir quem atualizou
    };
  }

  // Desativar notificação (admin only)
  @Patch('admin/:id/deactivate')
  @UseGuards(AdminGuard)
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const notification = await this.notificationsService.deactivate(id);

    return {
      ...notification,
      deactivatedBy: req.user.email,
      message: 'Notificação desativada com sucesso',
    };
  }

  // Reativar notificação (admin only)
  @Patch('admin/:id/activate')
  @UseGuards(AdminGuard)
  async activate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const notification = await this.notificationsService.update(id, {
      isActive: true,
    });

    return {
      ...notification,
      activatedBy: req.user.email,
      message: 'Notificação ativada com sucesso',
    };
  }

  // Remover notificação (admin only)
  @Delete('admin/:id')
  @UseGuards(AdminGuard)
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.notificationsService.remove(id);

    return {
      message: 'Notificação removida com sucesso',
      deletedBy: req.user.email,
      deletedAt: new Date().toISOString(),
    };
  }

  // Broadcast: Enviar notificação para todos os usuários (admin only)
  @Post('admin/broadcast')
  @UseGuards(AdminGuard)
  async broadcast(
    @Request() req: AuthenticatedRequest,
    @Body(ValidationPipe) createNotificationDto: CreateNotificationDto,
  ) {
    // Criar a notificação
    const notification = await this.notificationsService.create(
      createNotificationDto,
    );

    // Em uma implementação real, aqui você poderia:
    // - Enviar push notifications
    // - Enviar emails
    // - Usar WebSockets para notificação em tempo real

    return {
      ...notification,
      broadcastBy: req.user.email,
      broadcastAt: new Date().toISOString(),
      message: 'Notificação criada e será exibida para todos os usuários',
    };
  }
}
