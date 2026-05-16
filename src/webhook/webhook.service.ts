import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../database/entities/client.entity';
import { TokenService } from '../token/token.service';

interface SallaWebhookPayload {
  event: string;
  merchant: number;
  data?: {
    access_token?: string;
    refresh_token?: string;
    /** Unix timestamp (seconds) when the access token expires */
    expires?: number;
    scope?: string;
    token_type?: string;
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
    const data = payload.data;

    console.log(data);

    if (!data?.access_token || !data?.refresh_token || !data?.expires) {
      this.logger.warn(
        `Received app.store.authorize for merchant ${merchantId} but no token data`,
      );
      this.logger.debug(
        `Payload data received: ${JSON.stringify(data ?? null)}`,
      );
      return;
    }

    const client = await this.clientRepository.findOne({
      where: { sallaMerchantId: merchantId },
    });

    if (!client) {
      this.logger.warn(`Received webhook for unknown merchant ${merchantId}`);
      return;
    }

    // Salla sends `expires` as a Unix timestamp; convert to seconds-until-expiry
    const expiresInSeconds = data.expires - Math.floor(Date.now() / 1000);

    await this.tokenService.upsertToken(
      client.id,
      data.access_token,
      data.refresh_token,
      expiresInSeconds,
    );

    this.logger.log(
      `Token upserted for client ${client.id} (merchant ${merchantId})`,
    );
  }
}
