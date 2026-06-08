import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { ConsultationStatus, PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

describe('Consultations endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const patientEmail = `consult-patient-${Date.now()}@example.com`;
  const doctorEmail = `consult-doctor-${Date.now()}@example.com`;
  let patientToken: string;
  let doctorToken: string;
  let doctorProfileId: string;
  let consultationId: string;

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

    const patientRegister = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: patientEmail,
        password: 'password123',
        name: 'Consult Patient',
        dateOfBirth: '1990-05-20',
        planId: 'basic',
        role: UserRole.patient,
      })
      .expect(201);
    patientToken = patientRegister.body.accessToken;

    const doctorRegister = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email: doctorEmail,
        password: 'password123',
        name: 'Consult Doctor',
        dateOfBirth: '1980-01-10',
        planId: 'doctor',
        role: UserRole.doctor,
        crm: 'CRM/SP 777777',
        mainSpecialty: 'Cardiologia',
      })
      .expect(201);
    doctorToken = doctorRegister.body.accessToken;

    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { user: { email: doctorEmail } },
    });
    doctorProfileId = doctorProfile!.id;

    await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { isOnline: true, consultationFee: 200 },
    });
  }, 30000);

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [patientEmail, doctorEmail] } },
      include: { patientProfile: true, doctorProfile: true },
    });

    const patientIds = users
      .map((u) => u.patientProfile?.id)
      .filter((id): id is string => Boolean(id));
    const doctorIds = users
      .map((u) => u.doctorProfile?.id)
      .filter((id): id is string => Boolean(id));

    if (patientIds.length > 0 || doctorIds.length > 0) {
      await prisma.consultation.deleteMany({
        where: {
          OR: [
            ...(patientIds.length > 0 ? [{ patientId: { in: patientIds } }] : []),
            ...(doctorIds.length > 0 ? [{ doctorId: { in: doctorIds } }] : []),
          ],
        },
      });
    }

    await prisma.user.deleteMany({
      where: { email: { in: [patientEmail, doctorEmail] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /consultations/schedule creates scheduled consultation', async () => {
    const scheduledAt = new Date(Date.now() + 2 * 86400000).toISOString();

    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/consultations/schedule`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctorId: doctorProfileId, scheduledAt })
      .expect(201);

    consultationId = response.body.id;
    expect(response.body).toMatchObject({
      doctorId: doctorProfileId,
      type: 'SCHEDULED',
      status: 'waiting',
    });
  });

  it('POST /consultations/instant/request matches online doctor', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/consultations/instant/request`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ specialty: 'Cardiologia' })
      .expect(201);

    expect(response.body.matched).toBe(true);
    expect(response.body.consultation.type).toBe('INSTANT');
  });

  it('PATCH /consultations/:id/status activates consultation with mock room', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/consultations/${consultationId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: ConsultationStatus.active })
      .expect(200);

    expect(response.body.status).toBe('active');
    expect(response.body.roomUrl).toContain('mock.daily.co');
  });

  it('GET /consultations/:id/session returns mock room url', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/consultations/${consultationId}/session`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.roomUrl).toContain('mock.daily.co');
  });

  it('GET /consultations/me returns consultations for patient', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/consultations/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('PATCH /consultations/:id/status completes consultation', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/consultations/${consultationId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: ConsultationStatus.completed })
      .expect(200);

    expect(response.body.status).toBe('completed');
    expect(response.body.endedAt).toBeTruthy();
  });

  it('GET /consultations/me/history returns completed history', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/consultations/me/history`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.some((item: { id: string }) => item.id === consultationId)).toBe(
      true,
    );
  });
});
