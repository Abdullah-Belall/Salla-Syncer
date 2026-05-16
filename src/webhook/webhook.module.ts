import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { TokenModule } from '../token/token.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client]), TokenModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
