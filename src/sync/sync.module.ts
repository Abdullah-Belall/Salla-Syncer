import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { TokenModule } from '../token/token.module';
import { SallaModule } from '../salla/salla.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { ApiKeyAuthGuard } from '../common/guards/api-key-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, SyncLog]),
    TokenModule,
    SallaModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, ApiKeyAuthGuard],
})
export class SyncModule {}
