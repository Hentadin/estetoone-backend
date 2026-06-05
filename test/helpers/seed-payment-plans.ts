import { PrismaClient } from '@prisma/client';

export async function seedPaymentPlans(prisma: PrismaClient): Promise<void> {
  await Promise.all([
    prisma.paymentPlan.upsert({
      where: { type: 'basic' },
      update: { isActive: true },
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
      update: { isActive: true },
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
      update: { isActive: true },
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
      update: { isActive: true },
      create: {
        type: 'doctor',
        name: 'Doctor',
        description: 'Professional plan for physicians',
        priceMonthly: 99.9,
        features: ['Patient management', 'Telemedicine'],
      },
    }),
  ]);
}
