import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface ListDoctorsFilters {
  search?: string;
  specialty?: string;
  onlineOnly?: boolean;
  skip: number;
  take: number;
}

@Injectable()
export class DoctorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filters: ListDoctorsFilters) {
    const where: Prisma.DoctorProfileWhereInput = {};

    if (filters.onlineOnly) {
      where.isOnline = true;
    }

    if (filters.specialty) {
      where.mainSpecialty = { contains: filters.specialty, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { mainSpecialty: { contains: filters.search, mode: 'insensitive' } },
        { crm: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.doctorProfile.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ isOnline: 'desc' }, { name: 'asc' }],
    });
  }

  count(filters: Omit<ListDoctorsFilters, 'skip' | 'take'>) {
    const where: Prisma.DoctorProfileWhereInput = {};

    if (filters.onlineOnly) {
      where.isOnline = true;
    }

    if (filters.specialty) {
      where.mainSpecialty = { contains: filters.specialty, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { mainSpecialty: { contains: filters.search, mode: 'insensitive' } },
        { crm: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.doctorProfile.count({ where });
  }

  findById(id: string) {
    return this.prisma.doctorProfile.findUnique({ where: { id } });
  }

  findDoctorProfileByUserId(userId: string) {
    return this.prisma.doctorProfile.findUnique({ where: { userId } });
  }

  updateAvailability(userId: string, availability: Record<string, unknown> | null) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: {
        availability:
          availability === null
            ? Prisma.JsonNull
            : (availability as Prisma.InputJsonValue),
      },
    });
  }

  patchAvailability(userId: string, availability: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.doctorProfile.findUnique({ where: { userId } });
      if (!current) {
        return null;
      }

      const currentAvailability =
        current.availability && typeof current.availability === 'object'
          ? (current.availability as Record<string, unknown>)
          : {};

      return tx.doctorProfile.update({
        where: { userId },
        data: {
          availability: {
            ...currentAvailability,
            ...availability,
          } as Prisma.InputJsonValue,
        },
      });
    });
  }
}
