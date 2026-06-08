import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

describe('Doctors endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const doctorEmail = `doctors-e2e-${Date.now()}@example.com`;
  let doctorToken: string;
  let doctorProfileId: string;

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

    const doctorRegister = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: doctorEmail,
        password: 'password123',
        name: 'Doctors E2E Doctor',
        dateOfBirth: '1980-01-10',
        planId: 'doctor',
        role: UserRole.doctor,
        crm: 'CRM/SP 888888',
        mainSpecialty: 'Dermatologia',
      })
      .expect(201);

    doctorToken = doctorRegister.body.accessToken;

    const profile = await prisma.doctorProfile.findFirst({
      where: { user: { email: doctorEmail } },
    });
    doctorProfileId = profile!.id;

    await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { isOnline: true, consultationFee: 180 },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: doctorEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /doctors lists doctors publicly', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/doctors`)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: doctorProfileId,
          mainSpecialty: 'Dermatologia',
        }),
      ]),
    );
    expect(response.body.meta).toHaveProperty('total');
  });

  it('GET /doctors/online returns only online doctors', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/doctors/online`)
      .expect(200);

    expect(response.body.data.every((d: { isOnline: boolean }) => d.isOnline)).toBe(true);
  });

  it('GET /doctors/:id returns doctor detail', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/doctors/${doctorProfileId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: doctorProfileId,
      crm: 'CRM/SP 888888',
      mainSpecialty: 'Dermatologia',
    });
  });

  it('PUT /doctors/me/availability replaces availability', async () => {
    const response = await request(app.getHttpServer())
      .put(`/${apiPrefix}/doctors/me/availability`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ availability: { monday: ['09:00', '10:00'] } })
      .expect(200);

    expect(response.body.availability).toEqual({ monday: ['09:00', '10:00'] });
  });

  it('PATCH /doctors/me/availability merges availability', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/doctors/me/availability`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ availability: { tuesday: ['14:00'] } })
      .expect(200);

    expect(response.body.availability).toMatchObject({
      monday: ['09:00', '10:00'],
      tuesday: ['14:00'],
    });
  });
});
