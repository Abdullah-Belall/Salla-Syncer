import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Client } from '../database/entities/client.entity';
import { SallaToken } from '../database/entities/salla-token.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(SallaToken)
    private readonly tokenRepository: Repository<SallaToken>,
  ) {}

  async createClient(dto: CreateClientDto): Promise<{
    id: number;
    name: string;
    apiKey: string;
    sallaMerchantId: string;
    createdAt: Date;
  }> {
    const existing = await this.clientRepository.findOne({
      where: { sallaMerchantId: dto.sallaMerchantId },
    });

    if (existing) {
      throw new ConflictException(
        `Client with sallaMerchantId ${dto.sallaMerchantId} already exists`,
      );
    }

    const apiKey = 'sk_' + randomBytes(32).toString('hex');
    const client = this.clientRepository.create({
      name: dto.name,
      sallaMerchantId: dto.sallaMerchantId,
      apiKey,
    });

    const saved = await this.clientRepository.save(client);
    this.logger.log(`Created client ${saved.id} (${saved.name})`);

    return {
      id: saved.id,
      name: saved.name,
      apiKey: saved.apiKey,
      sallaMerchantId: saved.sallaMerchantId,
      createdAt: saved.createdAt,
    };
  }

  async listClients(): Promise<Client[]> {
    return this.clientRepository.find({
      select: ['id', 'name', 'sallaMerchantId', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async getClientById(id: number): Promise<{
    id: number;
    name: string;
    sallaMerchantId: string;
    createdAt: Date;
    tokenStatus: {
      hasToken: boolean;
      expiresAt: string | null;
      isExpired: boolean;
    };
  }> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    const token = await this.tokenRepository.findOne({
      where: { clientId: id },
    });

    const hasToken = !!token;
    const expiresAt = token ? token.expiresAt.toISOString() : null;
    const isExpired = token ? new Date(token.expiresAt) < new Date() : false;

    return {
      id: client.id,
      name: client.name,
      sallaMerchantId: client.sallaMerchantId,
      createdAt: client.createdAt,
      tokenStatus: { hasToken, expiresAt, isExpired },
    };
  }

  async deleteClient(id: number): Promise<{ message: string }> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    await this.tokenRepository.delete({ clientId: id });
    await this.clientRepository.delete(id);

    this.logger.log(`Deleted client ${id}`);
    return { message: `Client ${id} deleted successfully` };
  }
}
