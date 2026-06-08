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

  it('GET /v1/health/live returns liveness without dependency checks', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health/live').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });

  it('GET /v1/health/ready returns 200 when dependencies are up', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health/ready').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      db: 'up',
      redis: 'up',
      timestamp: expect.any(String),
    });
  });
});
