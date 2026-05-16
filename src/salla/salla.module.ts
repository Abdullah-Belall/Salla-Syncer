import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SallaService } from './salla.service';

@Module({
  imports: [HttpModule],
  providers: [SallaService],
  exports: [SallaService],
})
export class SallaModule {}
