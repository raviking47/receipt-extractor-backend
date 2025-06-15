import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ExtractReceiptDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export interface ReceiptItemDto {
  item_name: string;
  item_cost: number;
}

export interface AIReceiptResponse {
  date: string;
  currency: string;
  vendor_name: string;
  receipt_items: ReceiptItemDto[];
  tax: number;
  total: number;
}
