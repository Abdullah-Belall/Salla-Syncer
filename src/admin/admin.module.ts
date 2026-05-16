import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { SallaToken } from '../database/entities/salla-token.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, SallaToken])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
