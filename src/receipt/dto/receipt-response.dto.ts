export interface ReceiptResponseDto {
  id: string;
  date: string;
  currency: string;
  vendor_name: string;
  receipt_items: Array<{
    item_name: string;
    item_cost: number;
  }>;
  tax: number;
  total: number;
  image_url: string;
}
