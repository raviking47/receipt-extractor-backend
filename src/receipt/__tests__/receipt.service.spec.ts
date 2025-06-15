// src/receipt/__tests__/receipt.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }           from '@nestjs/typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs                         from 'fs';
import { ReceiptService }              from '../receipt.service';
import { Receipt }                     from '../entities/receipt.entity';

// 1) Mock both modules:
jest.mock('openai');
jest.mock('fs');

describe('ReceiptService', () => {
  let service: ReceiptService;
  const mockRepository = { save: jest.fn() };
  const mockFile: Express.Multer.File = {
    fieldname:    'file',
    originalname: 'test-receipt.jpg',
    encoding:     '7bit',
    mimetype:     'image/jpeg',
    destination:  './uploads',
    filename:     'test-uuid.jpg',
    path:         './uploads/test-uuid.jpg',
    size:          1024,
    buffer:       Buffer.from('test'),
    stream:       null,
  };

  beforeEach(async () => {
    // 2) Reset mocks & implementations:
    jest.resetAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Stub fs
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptService,
        { provide: getRepositoryToken(Receipt), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ReceiptService>(ReceiptService);
  });

  it('should successfully extract receipt details from valid image', async () => {
  const mockAIResponse = {
    date:         '2023-12-01',
    currency:     'USD',
    vendor_name:  'Test Store',
    receipt_items:[{ item_name: 'Test Item', item_cost: 10.99 }],
    tax:           1.10,
    total:         12.09,
    image_url:    '/uploads/test-uuid.jpg',
  };

  // 1) Build the object we want OpenAI to return:
  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }]
        }),
      },
    },
  };

  // 2) Grab the whole mocked module and ensure OpenAI is a jest.fn()
  const openaiModule = require('openai');
  if (typeof openaiModule.OpenAI !== 'function' || !openaiModule.OpenAI._isMockFunction) {
    openaiModule.OpenAI = jest.fn();
  }
  ;(openaiModule.OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

  // 3) Stub out fs and the repository
  (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy image'));
  mockRepository.save.mockResolvedValue({
    id:                'test-uuid',
    ...mockAIResponse,
    original_filename: 'test-receipt.jpg',
    created_at:        new Date(),
  });

  // 4) Run and assert
  const result = await service.extractReceiptDetails(mockFile);
  expect(result).toEqual({
    id:           'test-uuid',
    date:         '2023-12-01',
    currency:     'USD',
    vendor_name:  'Test Store',
    receipt_items:[{ item_name: 'Test Item', item_cost: 10.99 },],
    tax:           1.10,
    total:         12.09,
    image_url:    '/uploads/test-uuid.jpg',
  });

  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      date:             '2023-12-01',
      currency:         'USD',
      vendor_name:      'Test Store',
      receipt_items:    [{ item_name: 'Test Item', item_cost: 10.99 }],
      tax:               1.10,
      total:             12.09,
      image_url:        '/uploads/test-uuid.jpg',
      original_filename: 'test-receipt.jpg',
    }),
  );
});


  it('should throw BadRequestException for incorrect file type', async () => {
    const badFile = { ...mockFile, mimetype: 'application/pdf', originalname: 'foo.pdf' };
    await expect(service.extractReceiptDetails(badFile)).rejects.toThrow(
      new BadRequestException('Only .jpg, .jpeg, and .png files are allowed'),
    );
  });

  it('should throw InternalServerErrorException for invalid AI response', async () => {
    const { OpenAI } = require('openai');
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'not a valid json' } }],
          }),
        },
      },
    };
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));
    (fs.unlinkSync    as jest.Mock).mockImplementation(() => {});

    await expect(service.extractReceiptDetails(mockFile)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
  });

  it('should throw InternalServerErrorException for 500 status response', async () => {
    const { OpenAI } = require('openai');
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue({
            status:  500,
            message: 'Internal server error',
          }),
        },
      },
    };
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));
    (fs.unlinkSync    as jest.Mock).mockImplementation(() => {});

    await expect(service.extractReceiptDetails(mockFile)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
  });
});
