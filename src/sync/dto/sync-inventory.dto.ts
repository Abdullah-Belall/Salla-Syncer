import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

export class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

export class SyncInventoryDto {
  @IsString()
  @IsNotEmpty()
  warehouseCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items!: InventoryItemDto[];
}
