import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlans() {
    return this.prisma.paymentPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  findActivePlanByType(type: string) {
    return this.prisma.paymentPlan.findFirst({
      where: { type: type as never, isActive: true },
    });
  }
}
