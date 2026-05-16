import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SallaToken } from '../database/entities/salla-token.entity';
import { TokenService } from './token.service';

@Module({
  imports: [TypeOrmModule.forFeature([SallaToken]), HttpModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
