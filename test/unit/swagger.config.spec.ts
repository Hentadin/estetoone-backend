import { Controller, Get, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { buildSwaggerDocument, setupSwagger } from '../../src/config/swagger.config';

@ApiTags('ping')
@Controller('ping')
class PingController {
  @Get()
  @ApiOperation({ summary: 'Ping' })
  ping(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ controllers: [PingController] })
class PingModule {}

describe('swagger.config', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(PingModule);
    app.use(cookieParser());
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('builds OpenAPI 3.x document', () => {
    const document = buildSwaggerDocument(app);
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toBe('EstetoOne API');
    expect(document.paths['/v1/ping']).toBeDefined();
  });

  it('serves Swagger UI and JSON spec', async () => {
    const ui = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(ui.text).toContain('swagger-ui');

    const json = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(json.body.openapi).toMatch(/^3\./);
    expect(json.body.components.securitySchemes['access-token']).toBeDefined();
  });
});
