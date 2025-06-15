import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export interface ReceiptItem {
  item_name: string;
  item_cost: number;
}

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: string;

  @Column({ length: 3 })
  currency: string;

  @Column()
  vendor_name: string;

  @Column('json')
  receipt_items: ReceiptItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column()
  image_url: string;

  @Column()
  original_filename: string;

  @CreateDateColumn()
  created_at: Date;
}
