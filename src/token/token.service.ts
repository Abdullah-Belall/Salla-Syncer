import {
  ForbiddenException,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SallaToken } from '../database/entities/salla-token.entity';

interface SallaRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(SallaToken)
    private readonly tokenRepository: Repository<SallaToken>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getValidToken(clientId: number): Promise<string> {
    const token = await this.tokenRepository.findOne({ where: { clientId } });

    if (!token) {
      throw new ForbiddenException('Merchant has not authorized the app yet');
    }

    const now = Date.now();
    const expiresAt = new Date(token.expiresAt).getTime();

    if (expiresAt > now + this.EXPIRY_BUFFER_MS) {
      return token.accessToken;
    }

    this.logger.log(`Token for client ${clientId} is expiring — refreshing`);
    return this.refreshToken(token);
  }

  async upsertToken(
    clientId: number,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    let record = await this.tokenRepository.findOne({ where: { clientId } });

    if (record) {
      record.accessToken = accessToken;
      record.refreshToken = refreshToken;
      record.expiresAt = expiresAt;
    } else {
      record = this.tokenRepository.create({
        clientId,
        accessToken,
        refreshToken,
        expiresAt,
      });
    }

    await this.tokenRepository.save(record);
  }

  async getTokenRecord(clientId: number): Promise<SallaToken | null> {
    return this.tokenRepository.findOne({ where: { clientId } });
  }

  private async refreshToken(token: SallaToken): Promise<string> {
    const clientId = this.config.get<string>('SALLA_CLIENT_ID');
    const clientSecret = this.config.get<string>('SALLA_CLIENT_SECRET');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: token.refreshToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<SallaRefreshResponse>(
          'https://accounts.salla.sa/oauth2/token',
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      token.accessToken = access_token;
      token.refreshToken = refresh_token;
      token.expiresAt = expiresAt;
      await this.tokenRepository.save(token);

      this.logger.log(
        `Token refreshed for client ${token.clientId}, expires at ${expiresAt.toISOString()}`,
      );
      return access_token;
    } catch (err) {
      this.logger.error(`Failed to refresh token for client ${token.clientId}`, err);
      throw new InternalServerErrorException('Failed to refresh Salla access token');
    }
  }
}
