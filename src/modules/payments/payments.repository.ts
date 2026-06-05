import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlans() {
    return this.prisma.paymentPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  findSubscriptionByUserId(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  findPlanByStripePriceId(stripePriceId: string) {
    return this.prisma.paymentPlan.findFirst({
      where: { stripePriceId, isActive: true },
    });
  }

  findPlanByType(type: string) {
    return this.prisma.paymentPlan.findFirst({
      where: { type: type as never, isActive: true },
    });
  }

  findSubscriptionByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.subscription.findFirst({
      where: { stripeCustomerId },
      include: { plan: true },
    });
  }

  upsertSubscription(data: {
    userId: string;
    planId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status: SubscriptionStatus;
    currentPeriodEnd?: Date | null;
  }) {
    return this.prisma.subscription.upsert({
      where: { userId: data.userId },
      update: {
        planId: data.planId,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
      },
      create: {
        userId: data.userId,
        planId: data.planId,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
      },
      include: { plan: true },
    });
  }

  updateUserPlanId(userId: string, planId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { planId },
    });
  }

  findSubscriptionByStripeId(stripeSubscriptionId: string) {
    return this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: { plan: true },
    });
  }
}
