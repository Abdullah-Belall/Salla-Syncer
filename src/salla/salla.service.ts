import {
  Injectable,
  Logger,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface SallaProduct {
  productId: string;
  barcode: string;
  currentQuantity: number;
}

interface SallaProductResponse {
  data: Array<{
    id: string | number;
    sku: string;
    quantity: number;
  }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
}

@Injectable()
export class SallaService {
  private readonly logger = new Logger(SallaService.name);
  private readonly BASE_URL = 'https://api.salla.dev/admin/v2';

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async fetchAllProducts(
    accessToken: string,
  ): Promise<Map<string, SallaProduct>> {
    const productMap = new Map<string, SallaProduct>();
    let page = 1;
    let totalPages = 1;

    do {
      try {
        const response = await firstValueFrom(
          this.httpService.get<SallaProductResponse>(
            `${this.BASE_URL}/products`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { page },
            },
          ),
        );

        const { data, pagination } = response.data;

        for (const product of data) {
          const barcode = product.sku?.trim();
          if (barcode) {
            productMap.set(barcode, {
              productId: String(product.id),
              barcode,
              currentQuantity: product.quantity ?? 0,
            });
          }
        }

        if (pagination) {
          totalPages = pagination.totalPages;
        }

        page++;
      } catch (err) {
        this.handleAxiosError(err, `fetching products page ${page}`);
      }
    } while (page <= totalPages);

    this.logger.log(`Fetched ${productMap.size} products from Salla`);
    return productMap;
  }

  async updateProductQuantity(
    accessToken: string,
    productId: string,
    quantity: number,
    retryCount: number,
    retryDelayMs: number,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.put(
            `${this.BASE_URL}/products/${productId}`,
            { quantity },
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        );
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Attempt ${attempt}/${retryCount} failed for product ${productId}: ${this.extractErrorMessage(err)}`,
        );

        if (attempt < retryCount) {
          await this.sleep(retryDelayMs);
        }
      }
    }

    throw lastError;
  }

  private handleAxiosError(err: unknown, context: string): never {
    const axiosErr = err as AxiosError;

    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const message = `Salla API error while ${context}: HTTP ${status}`;
      this.logger.error(message);

      if (status >= 500) {
        throw new BadGatewayException('Salla API is currently unavailable');
      }
      throw new InternalServerErrorException(message);
    }

    this.logger.error(`Network error while ${context}: ${String(err)}`);
    throw new BadGatewayException('Could not reach Salla API');
  }

  private extractErrorMessage(err: unknown): string {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      return `HTTP ${axiosErr.response.status}`;
    }
    return String(err);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
