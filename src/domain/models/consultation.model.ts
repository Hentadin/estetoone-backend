import { ConsultationStatus, ConsultationType } from '@prisma/client';

const VALID_STATUS_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  [ConsultationStatus.waiting]: [ConsultationStatus.active, ConsultationStatus.cancelled],
  [ConsultationStatus.active]: [ConsultationStatus.completed, ConsultationStatus.cancelled],
  [ConsultationStatus.completed]: [],
  [ConsultationStatus.cancelled]: [],
};

export interface ScheduleConsultationInput {
  doctorId: string;
  scheduledAt: string;
}

export function validateScheduleConsultation(input: ScheduleConsultationInput): string[] {
  const errors: string[] = [];

  if (!input.doctorId?.trim()) {
    errors.push('doctorId is required');
  }

  if (!input.scheduledAt) {
    errors.push('scheduledAt is required');
  } else {
    const scheduledDate = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      errors.push('scheduledAt must be a valid ISO date');
    } else if (scheduledDate <= new Date()) {
      errors.push('scheduledAt must be in the future');
    }
  }

  return errors;
}

export function validateStatusTransition(
  current: ConsultationStatus,
  next: ConsultationStatus,
): string[] {
  if (current === next) {
    return [];
  }

  if (!VALID_STATUS_TRANSITIONS[current].includes(next)) {
    return [`Cannot transition from ${current} to ${next}`];
  }

  return [];
}

export function buildMockRoomUrl(consultationId: string): string {
  return `https://mock.daily.co/room-${consultationId}`;
}

export function toConsultationResponse(consultation: {
  id: string;
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  cost: { toNumber?: () => number } | number | null;
  roomUrl: string | null;
  doctor?: {
    id: string;
    name: string;
    mainSpecialty: string;
  };
  patient?: {
    id: string;
    name: string;
  };
}) {
  const cost =
    consultation.cost === null || consultation.cost === undefined
      ? null
      : typeof consultation.cost === 'number'
        ? consultation.cost
        : consultation.cost.toNumber?.() ?? Number(consultation.cost);

  return {
    id: consultation.id,
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    type: consultation.type,
    status: consultation.status,
    scheduledAt: consultation.scheduledAt?.toISOString() ?? null,
    startedAt: consultation.startedAt?.toISOString() ?? null,
    endedAt: consultation.endedAt?.toISOString() ?? null,
    duration: consultation.duration,
    cost,
    roomUrl: consultation.roomUrl,
    doctor: consultation.doctor
      ? {
          id: consultation.doctor.id,
          name: consultation.doctor.name,
          mainSpecialty: consultation.doctor.mainSpecialty,
        }
      : undefined,
    patient: consultation.patient
      ? {
          id: consultation.patient.id,
          name: consultation.patient.name,
        }
      : undefined,
  };
}
