import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptService } from './receipt.service';
import { ReceiptResponseDto } from './dto/receipt-response.dto';
import { multerConfig } from '../config/multer.config';

@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('extract-receipt-details')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async extractReceiptDetails(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ReceiptResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.receiptService.extractReceiptDetails(file);
  }
}
