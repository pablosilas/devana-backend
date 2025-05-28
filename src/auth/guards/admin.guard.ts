import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Interface para o usuário autenticado
interface AuthenticatedUser {
  userId?: number;
  guestId?: number;
  email?: string;
  sessionId?: string;
  type: 'user' | 'guest';
}

// Interface para o request com usuário autenticado
interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user: AuthenticatedUser = request.user;

    // Lista de emails administrativos
    // Em produção, isso viria do banco de dados ou configuração
    const adminEmails: string[] = [
      'admin@devana.com',
      'dev@devana.com',
      'joao@teste.com', // ← Adicione seu email aqui
      // Adicione outros emails admin aqui
    ];

    // Verificar se o usuário existe e é do tipo 'user'
    if (!user || user.type !== 'user') {
      throw new ForbiddenException(
        'Apenas usuários registrados podem acessar área administrativa',
      );
    }

    // Verificar se o email está presente
    if (!user.email) {
      throw new ForbiddenException('Email do usuário não encontrado no token');
    }

    // Verificar se o email está na lista de admins
    if (!adminEmails.includes(user.email)) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}
