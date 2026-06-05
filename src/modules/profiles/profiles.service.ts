import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  toDoctorProfileResponse,
  validateDoctorProfileUpdate,
} from '../../domain/models/doctor-profile.model';
import {
  toPatientProfileResponse,
  validatePatientProfileUpdate,
  validateProfilePhotoUrl,
} from '../../domain/models/patient-profile.model';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { UploadProfilePhotoDto } from './dto/upload-profile-photo.dto';
import { ProfilesRepository } from './profiles.repository';

@Injectable()
export class ProfilesService {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async getPatientProfile(user: AuthenticatedUser) {
    const profile = await this.profilesRepository.findPatientProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return toPatientProfileResponse(profile);
  }

  async updatePatientProfile(user: AuthenticatedUser, dto: UpdatePatientProfileDto) {
    const validationErrors = validatePatientProfileUpdate(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const profile = await this.profilesRepository.findPatientProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    const updated = await this.profilesRepository.updatePatientProfile(user.id, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(`${dto.dateOfBirth}T00:00:00.000Z`) : undefined,
    });

    return toPatientProfileResponse(updated);
  }

  async uploadPatientPhoto(user: AuthenticatedUser, dto: UploadProfilePhotoDto) {
    const validationErrors = validateProfilePhotoUrl(dto.profilePhotoUrl);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const profile = await this.profilesRepository.findPatientProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    const updated = await this.profilesRepository.updatePatientPhoto(
      user.id,
      dto.profilePhotoUrl,
    );

    return {
      profilePhotoUrl: updated.profilePhotoUrl,
    };
  }

  async deletePatientPhoto(user: AuthenticatedUser) {
    const profile = await this.profilesRepository.findPatientProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    await this.profilesRepository.updatePatientPhoto(user.id, null);

    return { profilePhotoUrl: null };
  }

  async getDoctorProfile(user: AuthenticatedUser) {
    const profile = await this.profilesRepository.findDoctorProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return toDoctorProfileResponse(profile);
  }

  async updateDoctorProfile(user: AuthenticatedUser, dto: UpdateDoctorProfileDto) {
    const validationErrors = validateDoctorProfileUpdate(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const profile = await this.profilesRepository.findDoctorProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updated = await this.profilesRepository.updateDoctorProfile(user.id, dto);

    return toDoctorProfileResponse(updated);
  }

  async uploadDoctorPhoto(user: AuthenticatedUser, dto: UploadProfilePhotoDto) {
    const validationErrors = validateProfilePhotoUrl(dto.profilePhotoUrl);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const profile = await this.profilesRepository.findDoctorProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updated = await this.profilesRepository.updateDoctorPhoto(
      user.id,
      dto.profilePhotoUrl,
    );

    return {
      profilePhotoUrl: updated.profilePhotoUrl,
    };
  }

  async deleteDoctorPhoto(user: AuthenticatedUser) {
    const profile = await this.profilesRepository.findDoctorProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    await this.profilesRepository.updateDoctorPhoto(user.id, null);

    return { profilePhotoUrl: null };
  }
}
