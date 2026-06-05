import { PrismaClient, UserRole, ConditionSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and reads a patient with health data', async () => {
    const email = `integration-patient-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('password123', 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.patient,
        patientProfile: {
          create: {
            name: 'Integration Patient',
            dateOfBirth: new Date('1990-01-01'),
            phone: '+55 11 90000-0000',
          },
        },
      },
      include: { patientProfile: true },
    });

    const patientId = user.patientProfile!.id;

    await prisma.healthCondition.create({
      data: {
        patientId,
        name: 'Hypertension',
        classification: 'ACC/AHA',
        severity: ConditionSeverity.controlled,
        lastAssessed: new Date('2025-05-02'),
      },
    });

    await prisma.medication.create({
      data: {
        patientId,
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        quantityRemaining: 10,
      },
    });

    const patientWithData = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        healthConditions: true,
        medications: true,
        user: true,
      },
    });

    expect(patientWithData?.user.email).toBe(email);
    expect(patientWithData?.healthConditions).toHaveLength(1);
    expect(patientWithData?.medications[0].name).toBe('Lisinopril');

    await prisma.user.delete({ where: { id: user.id } });
  });

  it('enforces unique email constraint', async () => {
    const email = `unique-email-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('password123', 12);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.patient,
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.patient,
        },
      }),
    ).rejects.toThrow();

    await prisma.user.deleteMany({ where: { email } });
  });
});
