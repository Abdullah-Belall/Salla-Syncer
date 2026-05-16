import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from './entities/client.entity';
import { SallaToken } from './entities/salla-token.entity';
import { SyncLog } from './entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Client, SallaToken, SyncLog],
        // NOTE: Set synchronize to false in production and use TypeORM migrations instead.
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
