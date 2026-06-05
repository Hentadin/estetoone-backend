import { PrismaClient, UserRole, ConditionSeverity, ConditionIcon, VitalType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const plans = await Promise.all([
    prisma.paymentPlan.upsert({
      where: { type: 'basic' },
      update: {},
      create: {
        type: 'basic',
        name: 'Basic',
        description: 'Free tier with limited features',
        priceMonthly: 0,
        features: ['Health wallet', '1 consultation/month'],
      },
    }),
    prisma.paymentPlan.upsert({
      where: { type: 'premium' },
      update: {},
      create: {
        type: 'premium',
        name: 'Premium',
        description: 'Full access for individuals',
        priceMonthly: 49.9,
        features: ['Unlimited consultations', 'AI analysis'],
      },
    }),
    prisma.paymentPlan.upsert({
      where: { type: 'family' },
      update: {},
      create: {
        type: 'family',
        name: 'Family',
        description: 'Up to 4 family members',
        priceMonthly: 89.9,
        features: ['4 profiles', 'Priority support'],
      },
    }),
    prisma.paymentPlan.upsert({
      where: { type: 'doctor' },
      update: {},
      create: {
        type: 'doctor',
        name: 'Doctor',
        description: 'Professional plan for physicians',
        priceMonthly: 99.9,
        features: ['Patient management', 'Telemedicine'],
      },
    }),
  ]);

  const basicPlan = plans.find((p) => p.type === 'basic')!;

  const patientUser = await prisma.user.upsert({
    where: { email: 'maria.silva@example.com' },
    update: {},
    create: {
      email: 'maria.silva@example.com',
      passwordHash,
      role: UserRole.patient,
      planId: basicPlan.id,
      lgpdConsentAt: new Date(),
      patientProfile: {
        create: {
          name: 'Maria Silva',
          phone: '+55 11 99999-0001',
          dateOfBirth: new Date('1985-03-15'),
          gender: 'female',
          address: 'São Paulo, SP',
          medicalHistory: 'Hypertension, Type 2 Diabetes',
          allergies: 'Penicillin',
          emergencyContact: 'João Silva',
          emergencyPhone: '+55 11 99999-0002',
          bloodType: 'O+',
          height: '165cm',
          weight: '68kg',
        },
      },
      subscription: {
        create: {
          planId: basicPlan.id,
          status: 'active',
        },
      },
    },
    include: { patientProfile: true },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.carlos@example.com' },
    update: {},
    create: {
      email: 'dr.carlos@example.com',
      passwordHash,
      role: UserRole.doctor,
      lgpdConsentAt: new Date(),
      doctorProfile: {
        create: {
          name: 'Dr. Carlos Mendes',
          crm: 'CRM-SP 123456',
          rqe: 'RQE 78901',
          mainSpecialty: 'Cardiology',
          bio: 'Cardiologist with 15 years of experience in telemedicine.',
          isOnline: true,
          consultationFee: 150.0,
          availability: {
            monday: ['09:00', '10:00', '14:00'],
            wednesday: ['10:00', '11:00'],
          },
        },
      },
    },
    include: { doctorProfile: true },
  });

  const patientId = patientUser.patientProfile!.id;

  await prisma.healthCondition.createMany({
    data: [
      {
        patientId,
        name: 'Type 2 Diabetes Mellitus',
        classification: 'American Diabetes Association',
        score: 'HbA1c: 7.2%',
        severity: ConditionSeverity.controlled,
        icon: ConditionIcon.pill,
        lastAssessed: new Date('2025-04-28'),
        treatment: 'Metformin, Lifestyle modification, Glucose monitoring',
      },
      {
        patientId,
        name: 'Hypertension',
        classification: 'American College of Cardiology/American Heart Association',
        score: 'Stage 1',
        severity: ConditionSeverity.controlled,
        icon: ConditionIcon.activity,
        lastAssessed: new Date('2025-05-02'),
        treatment: 'Lisinopril, Sodium restriction, Regular exercise',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.medication.createMany({
    data: [
      {
        patientId,
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        instructions: 'Take with breakfast and dinner',
        nextDose: '8:00 AM',
        quantityRemaining: 12,
        presentation: 'Oral tablet',
      },
      {
        patientId,
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        instructions: 'Take in the morning',
        nextDose: '8:00 AM',
        quantityRemaining: 5,
        presentation: 'Oral tablet',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.vital.createMany({
    data: [
      {
        patientId,
        type: VitalType.blood_pressure,
        value: '128/82',
        unit: 'mmHg',
        recordedAt: new Date('2025-05-02T08:00:00Z'),
      },
      {
        patientId,
        type: VitalType.glucose,
        value: '110',
        unit: 'mg/dL',
        recordedAt: new Date('2025-05-02T07:30:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  let consultationId: string | undefined;

  if (patientUser.patientProfile && doctorUser.doctorProfile) {
    const consultation = await prisma.consultation.create({
      data: {
        patientId: patientUser.patientProfile.id,
        doctorId: doctorUser.doctorProfile.id,
        type: 'SCHEDULED',
        status: 'completed',
        scheduledAt: new Date('2025-04-15T14:00:00Z'),
        startedAt: new Date('2025-04-15T14:00:00Z'),
        endedAt: new Date('2025-04-15T14:30:00Z'),
        duration: 30,
        cost: 150.0,
      },
    });
    consultationId = consultation.id;
  }

  await prisma.medicalRecord.createMany({
    data: [
      {
        patientId,
        consultationId,
        title: 'Hemograma Completo',
        summary:
          'Leucócitos: 7.200, Hemácias: 4.900.000, Hemoglobina: 14,2 g/dL. Todos os parâmetros dentro dos limites normais.',
        examType: 'laboratory',
        aiInterpretation:
          'Todos os parâmetros do hemograma estão dentro dos limites normais. Nenhuma alteração significativa detectada.',
        mimeType: 'application/pdf',
        uploadedAt: new Date('2025-05-05T10:00:00Z'),
      },
      {
        patientId,
        title: 'Raio-X de Tórax',
        summary: 'Campos pulmonares limpos. Coração com dimensões normais.',
        examType: 'imaging',
        mimeType: 'image/jpeg',
        uploadedAt: new Date('2025-04-20T15:30:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed:', {
    patient: patientUser.email,
    doctor: doctorUser.email,
    plans: plans.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
