import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/modules/auth/auth.service';

const getRefreshCookie = (headers: request.Response['headers']) => {
  const setCookie = headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return cookies.find((c) => c.startsWith(`${AuthService.refreshCookieName}=`));
};

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const testEmail = `auth-e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

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

  it('POST /auth/register creates patient and sets refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: testEmail,
        password: 'password123',
        name: 'E2E Patient',
        dateOfBirth: '1990-05-20',
        planId: 'basic',
        role: UserRole.patient,
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user).toMatchObject({
      email: testEmail,
      role: UserRole.patient,
      name: 'E2E Patient',
    });

    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    expect(cookies.some((c) => c.startsWith(`${AuthService.refreshCookieName}=`))).toBe(true);
  });

  it('POST /auth/login returns tokens for registered user', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        email: testEmail,
        password: 'password123',
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);
  });

  it('GET /auth/me returns authenticated user profile', async () => {
    const login = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        email: testEmail,
        password: 'password123',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/auth/me`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      email: testEmail,
      role: UserRole.patient,
    });
    expect(response.body.profile).toMatchObject({
      name: 'E2E Patient',
    });
  });

  it('POST /auth/refresh rotates tokens using refresh cookie', async () => {
    const login = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        email: testEmail,
        password: 'password123',
      });

    const refreshCookie = getRefreshCookie(login.headers);

    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/refresh`)
      .set('Cookie', refreshCookie ?? '')
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);

    const newRefreshCookie = getRefreshCookie(response.headers);
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toBe(refreshCookie);

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/refresh`)
      .set('Cookie', refreshCookie ?? '')
      .expect(401);
  });

  it('POST /auth/logout clears session', async () => {
    const login = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        email: testEmail,
        password: 'password123',
      });

    const refreshCookie = getRefreshCookie(login.headers);

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/logout`)
      .set('Cookie', refreshCookie ?? '')
      .expect(204);

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/refresh`)
      .set('Cookie', refreshCookie ?? '')
      .expect(401);
  });

  it('DELETE /auth/me removes account', async () => {
    const login = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        email: testEmail,
        password: 'password123',
      });

    await request(app.getHttpServer())
      .delete(`/${apiPrefix}/auth/me`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(204);

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user).toBeNull();
  });
});
