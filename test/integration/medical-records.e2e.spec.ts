import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

describe('Medical records and health wallet endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const patientEmail = `medical-records-patient-${Date.now()}@example.com`;
  const doctorEmail = `medical-records-doctor-${Date.now()}@example.com`;
  let patientToken: string;
  let doctorToken: string;
  let createdRecordId: string;

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
        name: 'Wallet Patient',
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
        name: 'Wallet Doctor',
        dateOfBirth: '1980-01-10',
        planId: 'doctor',
        role: UserRole.doctor,
        crm: 'CRM/SP 888888',
        mainSpecialty: 'Cardiologia',
      })
      .expect(201);

    doctorToken = doctorRegister.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [patientEmail, doctorEmail] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /health-wallet/me returns aggregated patient data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/health-wallet/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('conditions');
    expect(response.body).toHaveProperty('medications');
    expect(response.body).toHaveProperty('vitals');
    expect(response.body).toHaveProperty('exams');
    expect(response.body).toHaveProperty('consultations');
    expect(response.body).toHaveProperty('consultationHistory');
    expect(Array.isArray(response.body.conditions)).toBe(true);
    expect(Array.isArray(response.body.medications)).toBe(true);
  });

  it('POST /health-wallet/me/vitals creates a vital sign', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/health-wallet/me/vitals`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        type: 'heart_rate',
        value: '74',
        unit: 'bpm',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      type: 'heart_rate',
      value: '74',
      unit: 'bpm',
    });
  });

  it('POST /medical-records/me creates record with document metadata', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/medical-records/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Hemograma Completo',
        summary: 'Resultados dentro da normalidade.',
        examType: 'laboratory',
        aiInterpretation: 'Sem alterações significativas.',
        documentData: 'data:application/pdf;base64,YWJjMTIz',
      })
      .expect(201);

    createdRecordId = response.body.id;
    expect(response.body).toMatchObject({
      name: 'Hemograma Completo',
      type: 'laboratory',
      mimeType: 'application/pdf',
    });
    expect(response.body.documentUrl).toBe('data:application/pdf;base64,YWJjMTIz');
  });

  it('GET /medical-records/me lists patient records', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/medical-records/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).toHaveProperty('date');
  });

  it('GET /medical-records/me/:id returns record detail', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/medical-records/me/${createdRecordId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdRecordId);
    expect(response.body).toHaveProperty('documentUrl');
  });

  it('GET /health-wallet/me/consultations returns consultation data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/health-wallet/me/consultations`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('records');
    expect(response.body).toHaveProperty('history');
    expect(Array.isArray(response.body.records)).toBe(true);
    expect(Array.isArray(response.body.history)).toBe(true);
  });

  it('rejects doctor accessing patient health wallet', async () => {
    await request(app.getHttpServer())
      .get(`/${apiPrefix}/health-wallet/me`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403);
  });

  it('rejects invalid exam type on record creation', async () => {
    await request(app.getHttpServer())
      .post(`/${apiPrefix}/medical-records/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Invalid Exam',
        examType: 'invalid',
      })
      .expect(400);
  });

  it('DELETE /medical-records/me/:id removes record', async () => {
    await request(app.getHttpServer())
      .delete(`/${apiPrefix}/medical-records/me/${createdRecordId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/${apiPrefix}/medical-records/me/${createdRecordId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(404);
  });
});
