import { Injectable, NotFoundException } from '@nestjs/common';
import {
  toDoctorDetailResponse,
  toDoctorListingResponse,
} from '../../domain/models/doctor-listing.model';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import {
  PatchAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/update-availability.dto';
import { DoctorsRepository } from './doctors.repository';

@Injectable()
export class DoctorsService {
  constructor(private readonly doctorsRepository: DoctorsRepository) {}

  async listDoctors(query: ListDoctorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      this.doctorsRepository.findMany({
        search: query.search,
        specialty: query.specialty,
        skip,
        take: limit,
      }),
      this.doctorsRepository.count({
        search: query.search,
        specialty: query.specialty,
      }),
    ]);

    return {
      data: doctors.map(toDoctorListingResponse),
      meta: { page, limit, total },
    };
  }

  async listOnlineDoctors(query: ListDoctorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      this.doctorsRepository.findMany({
        search: query.search,
        specialty: query.specialty,
        onlineOnly: true,
        skip,
        take: limit,
      }),
      this.doctorsRepository.count({
        search: query.search,
        specialty: query.specialty,
        onlineOnly: true,
      }),
    ]);

    return {
      data: doctors.map(toDoctorListingResponse),
      meta: { page, limit, total },
    };
  }

  async getDoctorById(id: string) {
    const doctor = await this.doctorsRepository.findById(id);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return toDoctorDetailResponse(doctor);
  }

  async getMyAvailability(user: AuthenticatedUser) {
    const profile = await this.doctorsRepository.findDoctorProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return { availability: profile.availability ?? null };
  }

  async replaceAvailability(user: AuthenticatedUser, dto: UpdateAvailabilityDto) {
    const profile = await this.doctorsRepository.findDoctorProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updated = await this.doctorsRepository.updateAvailability(
      user.id,
      dto.availability,
    );

    return { availability: updated.availability ?? null };
  }

  async patchAvailability(user: AuthenticatedUser, dto: PatchAvailabilityDto) {
    const profile = await this.doctorsRepository.findDoctorProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (!dto.availability) {
      return { availability: profile.availability ?? null };
    }

    const updated = await this.doctorsRepository.patchAvailability(
      user.id,
      dto.availability,
    );

    return { availability: updated?.availability ?? null };
  }
}
