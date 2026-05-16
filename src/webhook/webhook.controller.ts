import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('salla')
  @HttpCode(HttpStatus.OK)
  async handleSallaWebhook(@Body() payload: Record<string, unknown>) {
    await this.webhookService.handleSallaWebhook(payload as any);
    return { received: true };
  }
}
