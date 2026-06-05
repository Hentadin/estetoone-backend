import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health returns status payload', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);

    expect(response.body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.stringMatching(/^(up|down)$/),
      redis: expect.stringMatching(/^(up|down)$/),
      timestamp: expect.any(String),
    });
  });
});
