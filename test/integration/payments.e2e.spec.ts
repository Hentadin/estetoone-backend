import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, SubscriptionStatus, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { seedPaymentPlans } from '../helpers/seed-payment-plans';

describe('Payments endpoints (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const testEmail = `payments-e2e-${Date.now()}@example.com`;
  let accessToken = '';
  let userId = '';
  let basicPlanId = '';

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    await seedPaymentPlans(prisma);

    const basicPlan = await prisma.paymentPlan.findFirst({ where: { type: 'basic' } });
    basicPlanId = basicPlan!.id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
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

    const register = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: testEmail,
        password: 'password123',
        name: 'Payments Patient',
        dateOfBirth: '1990-05-20',
        planId: 'basic',
        role: UserRole.patient,
      })
      .expect(201);

    accessToken = register.body.accessToken;
    userId = register.body.user.id;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /payments/plans returns available plans', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/payments/plans`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((plan: { type: string }) => plan.type === 'basic')).toBe(true);
  });

  it('POST /payments/setup-intent creates stripe setup intent', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/setup-intent`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(response.body.clientSecret).toMatch(/^seti_mock_/);
    expect(response.body.setupIntentId).toMatch(/^seti_mock_/);

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    expect(subscription?.stripeCustomerId).toMatch(/^cus_mock_/);
  });

  it('GET /payments/subscription returns user subscription', async () => {
    const existingSubscription = await prisma.subscription.findUnique({ where: { userId } });

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: basicPlanId,
        status: SubscriptionStatus.active,
      },
      create: {
        userId,
        planId: basicPlanId,
        status: SubscriptionStatus.active,
        stripeCustomerId: existingSubscription?.stripeCustomerId ?? 'cus_mock_test',
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/payments/subscription`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      planType: 'basic',
      planName: 'Basic',
      status: SubscriptionStatus.active,
    });
    expect(response.body.stripeCustomerId).toMatch(/^cus_mock_/);
  });

  it('POST /payments/webhook accepts valid mock signature', async () => {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    const payload = JSON.stringify({
      id: 'evt_test',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_webhook_test',
          customer: subscription?.stripeCustomerId ?? 'cus_mock_test',
          status: 'active',
          current_period_end: 1782864000,
          items: { data: [{ price: { id: 'price_unknown' } }] },
        },
      },
    });

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/webhook`)
      .set('stripe-signature', 'whsec_mock_test_webhook_secret')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200)
      .expect({ received: true });
  });

  it('POST /payments/webhook rejects invalid signature', async () => {
    await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/webhook`)
      .set('stripe-signature', 'invalid')
      .set('Content-Type', 'application/json')
      .send({ id: 'evt_bad', type: 'test.event', data: { object: {} } })
      .expect(400);
  });
});
