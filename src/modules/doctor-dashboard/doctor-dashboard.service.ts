import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { toConsultationResponse } from '../../domain/models/consultation.model';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AddPatientDto } from './dto/add-patient.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { DoctorDashboardRepository } from './doctor-dashboard.repository';

@Injectable()
export class DoctorDashboardService {
  constructor(
    private readonly doctorDashboardRepository: DoctorDashboardRepository,
    private readonly auditService: AuditService,
  ) {}

  private async resolveDoctor(user: AuthenticatedUser) {
    const doctor = await this.doctorDashboardRepository.findDoctorProfileByUserId(
      user.id,
    );

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctor;
  }

  async listPatients(user: AuthenticatedUser) {
    const doctor = await this.resolveDoctor(user);
    const links = await this.doctorDashboardRepository.findDistinctPatientsByDoctorId(
      doctor.id,
    );

    return links.map((link) => ({
      ...link.patient,
      dateOfBirth: link.patient.dateOfBirth.toISOString().split('T')[0],
      linkedAt: link.createdAt.toISOString(),
    }));
  }

  async addPatient(user: AuthenticatedUser, dto: AddPatientDto) {
    const doctor = await this.resolveDoctor(user);

    const patient = await this.doctorDashboardRepository.findPatientById(dto.patientId);
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.doctorDashboardRepository.hasExistingConsultation(
      doctor.id,
      patient.id,
    );

    if (existing) {
      throw new BadRequestException('Patient is already linked to this doctor');
    }

    await this.doctorDashboardRepository.createPatientLinkConsultation(
      doctor.id,
      patient.id,
    );

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'doctor_patient_link',
      resourceId: patient.id,
    });

    return {
      ...patient,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
    };
  }

  async getTodayAppointments(user: AuthenticatedUser) {
    const doctor = await this.resolveDoctor(user);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const appointments = await this.doctorDashboardRepository.findTodayAppointments(
      doctor.id,
      startOfDay,
      endOfDay,
    );

    return appointments.map((appointment) => ({
      ...toConsultationResponse(appointment),
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        phone: appointment.patient.phone,
      },
    }));
  }

  async updateOnlineStatus(user: AuthenticatedUser, dto: UpdateOnlineStatusDto) {
    const doctor = await this.resolveDoctor(user);

    const updated = await this.doctorDashboardRepository.updateOnlineStatus(
      user.id,
      dto.isOnline,
    );

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.update,
      resource: 'doctor_online_status',
      resourceId: doctor.id,
      metadata: { isOnline: dto.isOnline },
    });

    return { isOnline: updated.isOnline };
  }
}
