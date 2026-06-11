import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { ItemImportService } from './item-import.service';
import { ItemMasterController } from './item-master.controller';
import { ItemMasterService } from './item-master.service';

describe('ItemMasterController import routes', () => {
  let app: INestApplication;

  const itemMasterService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    generateBarcode: jest.fn(),
  };

  const importService = {
    preview: jest.fn(),
    import: jest.fn(),
  };

  const sampleRow = {
    name: 'Fresh milk 1L',
    groupCode: 'MARKET-DAIRY',
    categoryCode: 'MARKET-DAIRY',
    unitCode: 'PCS',
    code: 'MKT-099',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemMasterController],
      providers: [
        { provide: ItemMasterService, useValue: itemMasterService },
        { provide: ItemImportService, useValue: importService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/inventory/items/import/preview delegates to ItemImportService.preview', async () => {
    const previewResponse = {
      rows: [
        {
          rowNumber: 1,
          input: sampleRow,
          status: 'valid',
          errors: [],
        },
      ],
      summary: {
        totalRows: 1,
        validCount: 1,
        skipCount: 0,
        errorCount: 0,
      },
    };
    importService.preview.mockResolvedValue(previewResponse);

    const response = await request(app.getHttpServer())
      .post('/api/inventory/items/import/preview')
      .send({ rows: [sampleRow], duplicatePolicy: 'skip' })
      .expect(201);

    expect(response.body).toEqual(previewResponse);
    expect(importService.preview).toHaveBeenCalledWith({
      rows: [sampleRow],
      duplicatePolicy: 'skip',
    });
  });

  it('POST /api/inventory/items/import delegates to ItemImportService.import', async () => {
    const importResponse = {
      created: [{ rowNumber: 1, id: 'item-1', code: 'MKT-099', name: sampleRow.name }],
      skipped: [],
      failed: [],
      summary: {
        createdCount: 1,
        skippedCount: 0,
        failedCount: 0,
        totalRows: 1,
      },
    };
    importService.import.mockResolvedValue(importResponse);

    const response = await request(app.getHttpServer())
      .post('/api/inventory/items/import')
      .send({ rows: [sampleRow], duplicatePolicy: 'skip' })
      .expect(201);

    expect(response.body).toEqual(importResponse);
    expect(importService.import).toHaveBeenCalledWith({
      rows: [sampleRow],
      duplicatePolicy: 'skip',
    });
  });

  it('rejects invalid import payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/inventory/items/import/preview')
      .send({ rows: [{ name: '' }] })
      .expect(400);

    expect(importService.preview).not.toHaveBeenCalled();
  });
});
