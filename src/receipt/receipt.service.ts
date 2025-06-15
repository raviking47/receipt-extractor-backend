import {
  Injectable,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Receipt } from './entities/receipt.entity'
import { ReceiptResponseDto } from './dto/receipt-response.dto'
import { AIReceiptResponse } from './dto/extract-receipt.dto'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Service responsible for handling receipt processing operations.
 * Integrates with OpenAI for receipt data extraction and manages receipt storage.
 */
/**
 * Extracts detailed information from a receipt image file.
 * 
 * @param file - The uploaded receipt image file (supported formats: jpeg, jpg, png)
 * @returns Promise<ReceiptResponseDto> - Processed receipt details including extracted information
 * @throws BadRequestException - If file format is invalid or required fields are missing
 * @throws InternalServerErrorException - If AI processing fails or returns invalid data
 */
@Injectable()
export class ReceiptService {
  private openai: OpenAI

  constructor (
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async extractReceiptDetails (
    file: Express.Multer.File
  ): Promise<ReceiptResponseDto> {
    try {
      // Validate file format
      this.validateFileFormat(file)

      // Extract details using AI
      const aiResponse = await this.extractWithAI(file)

      // Verify AI response
      this.verifyAIResponse(aiResponse)

      // Save to database
      const savedReceipt = await this.saveReceipt(file, aiResponse)

      return this.formatResponse(savedReceipt)
    } catch (error) {
      // Clean up uploaded file if something goes wrong
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
      throw error
    }
  }

  private validateFileFormat (file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided')
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only .jpg, .jpeg, and .png files are allowed'
      )
    }
  }

  private async extractWithAI (
    file: Express.Multer.File
  ): Promise<AIReceiptResponse> {
    try {
      const imageBuffer = fs.readFileSync(file.path)
      const base64Image = imageBuffer.toString('base64')

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract the following fields from the provided receipt image and output only a single JSON object (no extra text or formatting):

{
  "date": "YYYY-MM-DD",
  "currency": "3-letter currency code (e.g. USD, EUR, GBP)",
  "vendor_name": "String",
  "receipt_items": [
    {
      "item_name": "String",
      "item_cost": Number
    }
  ],
  "tax": Number,
  "total": Number
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],

        max_tokens: 1000
      })

      const content = response.choices[0]?.message?.content
      console.log('AI Response:', content)
      if (!content) {
        throw new InternalServerErrorException(
          'AI model returned empty response'
        )
      }

      return JSON.parse(content)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new InternalServerErrorException(
          'AI model returned invalid JSON response'
        )
      }
      if (error.status === 500) {
        throw new InternalServerErrorException('AI service returned 500 status')
      }
      throw new InternalServerErrorException(
        `AI extraction failed: ${error.message}`
      )
    }
  }

  private verifyAIResponse (response: AIReceiptResponse): void {
    if (!response || typeof response !== 'object') {
      throw new BadRequestException('Invalid response from AI model')
    }

    const requiredFields = [
      'date',
      'currency',
      'vendor_name',
      'receipt_items',
      'tax',
      'total'
    ]
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new BadRequestException(`Missing required field: ${field}`)
      }
    }

    if (!Array.isArray(response.receipt_items)) {
      throw new BadRequestException('receipt_items must be an array')
    }

    if (response.receipt_items.length === 0) {
      throw new BadRequestException('receipt_items cannot be empty')
    }

    // Validate each receipt item
    for (const item of response.receipt_items) {
      if (!item.item_name || typeof item.item_cost !== 'number') {
        throw new BadRequestException('Invalid receipt item format')
      }
    }

    // Validate currency code
    if (
      typeof response.currency !== 'string' ||
      response.currency.length !== 3
    ) {
      throw new BadRequestException('Currency must be a 3-character code')
    }

    // Validate numeric fields
    if (
      typeof response.tax !== 'number' ||
      typeof response.total !== 'number'
    ) {
      throw new BadRequestException('Tax and total must be numbers')
    }
  }

  private async saveReceipt (
    file: Express.Multer.File,
    aiResponse: AIReceiptResponse
  ): Promise<Receipt> {
    const receipt = new Receipt()
    receipt.date = aiResponse.date
    receipt.currency = aiResponse.currency.toUpperCase()
    receipt.vendor_name = aiResponse.vendor_name
    receipt.receipt_items = aiResponse.receipt_items
    receipt.tax = aiResponse.tax
    receipt.total = aiResponse.total
    receipt.image_url = `/uploads/${file.filename}`
    receipt.original_filename = file.originalname

    return await this.receiptRepository.save(receipt)
  }

  private formatResponse (receipt: Receipt): ReceiptResponseDto {
    return {
      id: receipt.id,
      date: receipt.date,
      currency: receipt.currency,
      vendor_name: receipt.vendor_name,
      receipt_items: receipt.receipt_items,
      tax: receipt.tax,
      total: receipt.total,
      image_url: receipt.image_url
    }
  }
}

