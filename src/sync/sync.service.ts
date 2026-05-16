import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SyncLog } from '../database/entities/sync-log.entity';
import { TokenService } from '../token/token.service';
import { SallaService } from '../salla/salla.service';
import { SyncInventoryDto } from './dto/sync-inventory.dto';

export interface SyncResult {
  status: 'success' | 'partial' | 'failed';
  totalItems: number;
  matchedProducts: number;
  updatedProducts: number;
  skippedNoChange: number;
  skippedNotFound: number;
  failedUpdates: number;
  startedAt: string;
  finishedAt: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncLog)
    private readonly syncLogRepository: Repository<SyncLog>,
    private readonly tokenService: TokenService,
    private readonly sallaService: SallaService,
    private readonly config: ConfigService,
  ) {}

  async syncInventory(
    clientId: number,
    dto: SyncInventoryDto,
  ): Promise<SyncResult> {
    const startedAt = new Date();

    // Step 2: Get a valid access token
    const accessToken = await this.tokenService.getValidToken(clientId);

    // Step 3: Aggregate duplicate barcodes — sum quantities, floor to non-negative
    const aggregated = new Map<string, number>();
    for (const item of dto.items) {
      const barcode = item.barcode.trim();
      const current = aggregated.get(barcode) ?? 0;
      aggregated.set(barcode, Math.max(0, Math.floor(current + item.quantity)));
    }

    const totalItems = aggregated.size;

    // Step 4: Fetch all Salla products
    const sallaProducts = await this.sallaService.fetchAllProducts(accessToken);

    // Step 5: Build update list
    const updateList: Array<{ productId: string; quantity: number }> = [];
    let skippedNotFound = 0;
    let skippedNoChange = 0;

    for (const [barcode, quantity] of aggregated.entries()) {
      const product = sallaProducts.get(barcode);

      if (!product) {
        skippedNotFound++;
        continue;
      }

      if (product.currentQuantity === quantity) {
        skippedNoChange++;
        continue;
      }

      updateList.push({ productId: product.productId, quantity });
    }

    const matchedProducts = totalItems - skippedNotFound;

    // Step 6: Update products with concurrency control
    const concurrency = this.config.get<number>('SALLA_UPDATE_CONCURRENCY') ?? 5;
    const retryCount = this.config.get<number>('SALLA_RETRY_COUNT') ?? 3;
    const retryDelayMs = this.config.get<number>('SALLA_RETRY_DELAY_MS') ?? 500;

    let updatedProducts = 0;
    let failedUpdates = 0;

    for (let i = 0; i < updateList.length; i += concurrency) {
      const chunk = updateList.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        chunk.map(({ productId, quantity }) =>
          this.sallaService.updateProductQuantity(
            accessToken,
            productId,
            quantity,
            retryCount,
            retryDelayMs,
          ),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          updatedProducts++;
        } else {
          failedUpdates++;
          this.logger.error(`Failed to update product: ${String(result.reason)}`);
        }
      }
    }

    // Step 7: Determine overall status
    let status: 'success' | 'partial' | 'failed';
    if (failedUpdates === 0) {
      status = 'success';
    } else if (updatedProducts > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    const finishedAt = new Date();

    // Step 8: Save sync log
    const log = this.syncLogRepository.create({
      clientId,
      status,
      totalItems,
      matchedProducts,
      updatedProducts,
      skippedNoChange,
      skippedNotFound,
      failedUpdates,
      startedAt,
      finishedAt,
    });
    await this.syncLogRepository.save(log);

    this.logger.log(
      `Sync complete for client ${clientId}: status=${status}, updated=${updatedProducts}, failed=${failedUpdates}`,
    );

    // Step 9: Return result
    return {
      status,
      totalItems,
      matchedProducts,
      updatedProducts,
      skippedNoChange,
      skippedNotFound,
      failedUpdates,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
  }

  async getSyncHistory(
    requestingClientId: number,
    targetClientId: number,
  ): Promise<SyncLog[]> {
    if (requestingClientId !== targetClientId) {
      throw new ForbiddenException(
        'You are not authorized to view this client\'s sync history',
      );
    }

    return this.syncLogRepository.find({
      where: { clientId: targetClientId },
      order: { startedAt: 'DESC' },
      take: 20,
    });
  }
}
