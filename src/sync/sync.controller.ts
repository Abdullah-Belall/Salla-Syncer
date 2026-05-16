import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { ApiKeyAuthGuard } from '../common/guards/api-key-auth.guard';
import { ClientId } from '../common/decorators/client.decorator';
import { SyncInventoryDto } from './dto/sync-inventory.dto';

@Controller('sync')
@UseGuards(ApiKeyAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('inventory')
  @HttpCode(HttpStatus.OK)
  syncInventory(
    @ClientId() clientId: number,
    @Body() dto: SyncInventoryDto,
  ) {
    return this.syncService.syncInventory(clientId, dto);
  }

  @Get('history/:clientId')
  getSyncHistory(
    @ClientId() requestingClientId: number,
    @Param('clientId', ParseIntPipe) targetClientId: number,
  ) {
    return this.syncService.getSyncHistory(requestingClientId, targetClientId);
  }
}
