import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

describe('Profiles endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const patientEmail = `profiles-patient-${Date.now()}@example.com`;
  const doctorEmail = `profiles-doctor-${Date.now()}@example.com`;
  let patientToken: string;
  let doctorToken: string;

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
        name: 'Profile Patient',
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
        name: 'Profile Doctor',
        dateOfBirth: '1980-01-10',
        planId: 'doctor',
        role: UserRole.doctor,
        crm: 'CRM/SP 999999',
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

  it('GET /profiles/patient/me returns full patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/profiles/patient/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Profile Patient',
      dateOfBirth: '1990-05-20',
    });
    expect(response.body).toHaveProperty('healthConditions');
    expect(response.body).toHaveProperty('medications');
  });

  it('PATCH /profiles/patient/me updates profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/profiles/patient/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        phone: '+55 11 99999-0001',
        bloodType: 'O+',
        medicalHistory: 'Hypertension',
        allergies: 'Penicillin',
        height: '170cm',
        weight: '70kg',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      phone: '+55 11 99999-0001',
      bloodType: 'O+',
      medicalHistory: 'Hypertension',
      allergies: 'Penicillin',
      height: '170cm',
      weight: '70kg',
    });
  });

  it('PATCH /profiles/patient/me rejects invalid blood type', async () => {
    await request(app.getHttpServer())
      .patch(`/${apiPrefix}/profiles/patient/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ bloodType: 'INVALID' })
      .expect(400);
  });

  it('PUT /profiles/patient/me/photo stores data URL', async () => {
    const response = await request(app.getHttpServer())
      .put(`/${apiPrefix}/profiles/patient/me/photo`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ profilePhotoUrl: 'data:image/png;base64,abc123' })
      .expect(200);

    expect(response.body.profilePhotoUrl).toBe('data:image/png;base64,abc123');
  });

  it('DELETE /profiles/patient/me/photo clears photo', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/${apiPrefix}/profiles/patient/me/photo`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.profilePhotoUrl).toBeNull();
  });

  it('GET /profiles/doctor/me returns doctor profile', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/profiles/doctor/me`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Profile Doctor',
      crm: 'CRM/SP 999999',
      mainSpecialty: 'Cardiologia',
    });
  });

  it('PATCH /profiles/doctor/me updates doctor profile', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/profiles/doctor/me`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        bio: 'Cardiologist with 10 years experience',
        isOnline: true,
        consultationFee: 200,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      bio: 'Cardiologist with 10 years experience',
      isOnline: true,
      consultationFee: 200,
    });
  });

  it('PUT /profiles/doctor/me/photo stores photo URL', async () => {
    const response = await request(app.getHttpServer())
      .put(`/${apiPrefix}/profiles/doctor/me/photo`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ profilePhotoUrl: 'https://cdn.example.com/doctor.jpg' })
      .expect(200);

    expect(response.body.profilePhotoUrl).toBe('https://cdn.example.com/doctor.jpg');
  });

  it('rejects patient accessing doctor profile endpoints', async () => {
    await request(app.getHttpServer())
      .get(`/${apiPrefix}/profiles/doctor/me`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);
  });
});
