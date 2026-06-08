import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, ConsultationStatus, ConsultationType } from '@prisma/client';
import {
  buildMockRoomUrl,
  toConsultationResponse,
  validateScheduleConsultation,
  validateStatusTransition,
} from '../../domain/models/consultation.model';
import { toConsultationHistoryResponse } from '../../domain/models/consultation-history.model';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { InstantConsultationRequestDto } from './dto/instant-consultation.dto';
import { ScheduleConsultationDto } from './dto/schedule-consultation.dto';
import { UpdateConsultationStatusDto } from './dto/update-consultation-status.dto';
import { ConsultationsRepository } from './consultations.repository';

const INSTANT_QUEUE_KEY = 'consultations:instant:queue';

interface InstantQueueEntry {
  patientId: string;
  specialty?: string;
  requestedAt: string;
}

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
  ) {}

  async scheduleConsultation(user: AuthenticatedUser, dto: ScheduleConsultationDto) {
    const errors = validateScheduleConsultation(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const patient = await this.consultationsRepository.findPatientProfileByUserId(user.id);
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const doctor = await this.consultationsRepository.findDoctorById(dto.doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const cost = doctor.consultationFee?.toNumber?.() ?? undefined;

    const consultation = await this.consultationsRepository.createConsultation({
      patientId: patient.id,
      doctorId: doctor.id,
      type: ConsultationType.SCHEDULED,
      scheduledAt: new Date(dto.scheduledAt),
      cost,
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'consultation',
      resourceId: consultation.id,
      metadata: { type: ConsultationType.SCHEDULED },
    });

    return toConsultationResponse(consultation);
  }

  async requestInstantConsultation(
    user: AuthenticatedUser,
    dto: InstantConsultationRequestDto,
  ) {
    const patient = await this.consultationsRepository.findPatientProfileByUserId(user.id);
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const onlineDoctor = await this.consultationsRepository.findFirstOnlineDoctor(
      dto.specialty,
    );

    if (onlineDoctor) {
      const consultation = await this.consultationsRepository.createConsultation({
        patientId: patient.id,
        doctorId: onlineDoctor.id,
        type: ConsultationType.INSTANT,
        cost: onlineDoctor.consultationFee?.toNumber?.() ?? undefined,
      });

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.create,
        resource: 'consultation',
        resourceId: consultation.id,
        metadata: { type: ConsultationType.INSTANT, matched: true },
      });

      return {
        matched: true,
        consultation: toConsultationResponse(consultation),
      };
    }

    const queueEntry: InstantQueueEntry = {
      patientId: patient.id,
      specialty: dto.specialty,
      requestedAt: new Date().toISOString(),
    };

    const redis = this.redisService.getClient();
    await redis.lpush(INSTANT_QUEUE_KEY, JSON.stringify(queueEntry));

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'consultation_queue',
      metadata: { specialty: dto.specialty },
    });

    return {
      matched: false,
      queued: true,
      message: 'No online doctors available. You have been added to the queue.',
    };
  }

  async matchInstantConsultation(user: AuthenticatedUser) {
    const doctor = await this.consultationsRepository.findDoctorProfileByUserId(user.id);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (!doctor.isOnline) {
      throw new BadRequestException('Doctor must be online to match instant consultations');
    }

    const redis = this.redisService.getClient();
    const rawEntry = await redis.rpop(INSTANT_QUEUE_KEY);

    if (!rawEntry) {
      throw new NotFoundException('No patients waiting in the instant consult queue');
    }

    const entry = JSON.parse(rawEntry) as InstantQueueEntry;

    const consultation = await this.consultationsRepository.createConsultation({
      patientId: entry.patientId,
      doctorId: doctor.id,
      type: ConsultationType.INSTANT,
      cost: doctor.consultationFee?.toNumber?.() ?? undefined,
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'consultation',
      resourceId: consultation.id,
      metadata: { type: ConsultationType.INSTANT, matched: true, fromQueue: true },
    });

    return toConsultationResponse(consultation);
  }

  async updateConsultationStatus(
    user: AuthenticatedUser,
    consultationId: string,
    dto: UpdateConsultationStatusDto,
  ) {
    const consultation = await this.consultationsRepository.findById(consultationId);
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    await this.assertConsultationAccess(user, consultation.patientId, consultation.doctorId);

    const transitionErrors = validateStatusTransition(consultation.status, dto.status);
    if (transitionErrors.length > 0) {
      throw new BadRequestException(transitionErrors);
    }

    const timestamps: {
      startedAt?: Date;
      endedAt?: Date;
      duration?: number;
      roomUrl?: string;
    } = {};

    if (dto.status === ConsultationStatus.active) {
      timestamps.startedAt = new Date();
      timestamps.roomUrl = buildMockRoomUrl(consultationId);
    }

    if (dto.status === ConsultationStatus.completed) {
      const startedAt = consultation.startedAt ?? new Date();
      timestamps.startedAt = consultation.startedAt ?? startedAt;
      timestamps.endedAt = new Date();
      timestamps.duration = Math.round(
        (timestamps.endedAt.getTime() - startedAt.getTime()) / 60000,
      );
    }

    const updated = await this.consultationsRepository.updateStatus(
      consultationId,
      dto.status,
      timestamps,
    );

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.update,
      resource: 'consultation',
      resourceId: consultationId,
      metadata: { status: dto.status },
    });

    return toConsultationResponse(updated);
  }

  async getMyConsultations(user: AuthenticatedUser) {
    if (user.role === 'doctor') {
      const doctor = await this.consultationsRepository.findDoctorProfileByUserId(user.id);
      if (!doctor) {
        throw new NotFoundException('Doctor profile not found');
      }

      const consultations = await this.consultationsRepository.findByDoctorId(doctor.id);
      return consultations.map(toConsultationResponse);
    }

    const patient = await this.consultationsRepository.findPatientProfileByUserId(user.id);
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const consultations = await this.consultationsRepository.findByPatientId(patient.id);
    return consultations.map(toConsultationResponse);
  }

  async getMyHistory(user: AuthenticatedUser) {
    const patient = await this.consultationsRepository.findPatientProfileByUserId(user.id);
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const consultations = await this.consultationsRepository.findHistoryByPatientId(
      patient.id,
    );

    return consultations.map(toConsultationHistoryResponse);
  }

  async getVideoSession(user: AuthenticatedUser, consultationId: string) {
    const consultation = await this.consultationsRepository.findById(consultationId);
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    await this.assertConsultationAccess(user, consultation.patientId, consultation.doctorId);

    if (consultation.status !== ConsultationStatus.active) {
      throw new BadRequestException('Video session is only available for active consultations');
    }

    const roomUrl = consultation.roomUrl ?? buildMockRoomUrl(consultationId);

    return { roomUrl };
  }

  async createVideoSession(user: AuthenticatedUser, consultationId: string) {
    const consultation = await this.consultationsRepository.findById(consultationId);
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    await this.assertConsultationAccess(user, consultation.patientId, consultation.doctorId);

    if (
      consultation.status !== ConsultationStatus.active &&
      consultation.status !== ConsultationStatus.waiting
    ) {
      throw new BadRequestException(
        'Video session can only be created for waiting or active consultations',
      );
    }

    const roomUrl = buildMockRoomUrl(consultationId);
    const updated = await this.consultationsRepository.updateRoomUrl(consultationId, roomUrl);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.update,
      resource: 'consultation_session',
      resourceId: consultationId,
    });

    return {
      roomUrl,
      consultation: toConsultationResponse(updated),
    };
  }

  private async assertConsultationAccess(
    user: AuthenticatedUser,
    patientId: string,
    doctorId: string,
  ) {
    if (user.role === 'admin') {
      return;
    }

    if (user.role === 'patient') {
      const patient = await this.consultationsRepository.findPatientProfileByUserId(user.id);
      if (!patient || patient.id !== patientId) {
        throw new ForbiddenException('You do not have access to this consultation');
      }
      return;
    }

    if (user.role === 'doctor') {
      const doctor = await this.consultationsRepository.findDoctorProfileByUserId(user.id);
      if (!doctor || doctor.id !== doctorId) {
        throw new ForbiddenException('You do not have access to this consultation');
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
