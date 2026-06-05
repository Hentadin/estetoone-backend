import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

describe('Doctor dashboard endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const apiPrefix = process.env.API_PREFIX ?? 'v1';
  const patientEmail = `dash-patient-${Date.now()}@example.com`;
  const doctorEmail = `dash-doctor-${Date.now()}@example.com`;
  let patientToken: string;
  let doctorToken: string;
  let patientProfileId: string;

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
        name: 'Dashboard Patient',
        dateOfBirth: '1992-03-15',
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
        name: 'Dashboard Doctor',
        dateOfBirth: '1975-06-20',
        planId: 'doctor',
        role: UserRole.doctor,
        crm: 'CRM/SP 666666',
        mainSpecialty: 'Pediatria',
      })
      .expect(201);
    doctorToken = doctorRegister.body.accessToken;

    const patientProfile = await prisma.patientProfile.findFirst({
      where: { user: { email: patientEmail } },
    });
    patientProfileId = patientProfile!.id;
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

  it('PATCH /doctor-dashboard/online-status toggles online', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${apiPrefix}/doctor-dashboard/online-status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ isOnline: true })
      .expect(200);

    expect(response.body.isOnline).toBe(true);
  });

  it('POST /doctor-dashboard/patients links patient', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${apiPrefix}/doctor-dashboard/patients`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId: patientProfileId })
      .expect(201);

    expect(response.body).toMatchObject({
      id: patientProfileId,
      name: 'Dashboard Patient',
    });
  });

  it('GET /doctor-dashboard/patients lists linked patients', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${apiPrefix}/doctor-dashboard/patients`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: patientProfileId, name: 'Dashboard Patient' }),
      ]),
    );
  });

  it('rejects patient accessing doctor dashboard', async () => {
    await request(app.getHttpServer())
      .get(`/${apiPrefix}/doctor-dashboard/patients`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);
  });
});
