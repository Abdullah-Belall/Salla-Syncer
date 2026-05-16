import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Client } from '../../database/entities/client.entity';

export interface AuthenticatedRequest extends Request {
  clientId: number;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    const client = await this.clientRepository.findOne({
      where: { apiKey },
      select: ['id'],
    });

    if (!client) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.clientId = client.id;
    return true;
  }
}
