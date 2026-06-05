import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { seedPaymentPlans } from '../helpers/seed-payment-plans';

describe('Onboarding endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const testEmail = `onboarding-e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    await seedPaymentPlans(prisma);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix(apiPrefix);
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
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /plans returns available plans', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/plans`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((plan: { type: string }) => plan.type === 'basic')).toBe(true);
  });

  it('GET /plans/:planId/validate confirms selected plan', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/plans/basic/validate`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'basic',
      type: 'basic',
    });
  });

  it('GET /auth/check-email reports availability', async () => {
    const available = await request(app.getHttpServer())
      .get(`/${apiPrefix}/auth/check-email`)
      .query({ email: testEmail })
      .expect(200);

    expect(available.body).toEqual({ available: true });
  });

  it('POST /auth/validate-registration validates onboarding payload', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/validate-registration`)
      .send({
        email: testEmail,
        password: 'password123',
        name: 'Onboarding Patient',
        phone: '11999999999',
        dateOfBirth: '1990-05-20',
        gender: 'masculino',
        planId: 'basic',
        aiCommunicationStyle: 'acolhedora',
      })
      .expect(200);

    expect(response.body).toEqual({ valid: true });
  });

  it('GET /payments/plans returns available plans for signup', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/payments/plans`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((plan: { type: string }) => plan.type === 'basic')).toBe(true);
  });

  it('POST /auth/register completes patient onboarding', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: testEmail,
        password: 'password123',
        name: 'Onboarding Patient',
        phone: '11999999999',
        dateOfBirth: '1990-05-20',
        gender: 'masculino',
        emergencyContact: 'Maria Silva',
        emergencyPhone: '11888888888',
        aiCommunicationStyle: 'acolhedora',
        planId: 'basic',
        role: UserRole.patient,
      })
      .expect(201);

    expect(response.body.user).toMatchObject({
      email: testEmail,
      role: UserRole.patient,
      name: 'Onboarding Patient',
    });
  });
});
