import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../database/entities/client.entity';
import { TokenService } from '../token/token.service';

interface SallaWebhookPayload {
  event: string;
  merchant: number;
  data?: {
    token?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tokenService: TokenService,
  ) {}

  async handleSallaWebhook(payload: SallaWebhookPayload): Promise<void> {
    if (payload.event !== 'app.store.authorize') {
      this.logger.debug(`Ignored webhook event: ${payload.event}`);
      return;
    }

    const merchantId = String(payload.merchant);
    const tokenData = payload.data?.token;

    if (!tokenData) {
      this.logger.warn(
        `Received app.store.authorize for merchant ${merchantId} but no token data`,
      );
      return;
    }

    const client = await this.clientRepository.findOne({
      where: { sallaMerchantId: merchantId },
    });

    if (!client) {
      this.logger.warn(
        `Received webhook for unknown merchant ${merchantId}`,
      );
      return;
    }

    await this.tokenService.upsertToken(
      client.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in,
    );

    this.logger.log(
      `Token upserted for client ${client.id} (merchant ${merchantId})`,
    );
  }
}
