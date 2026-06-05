import { ConsultationStatus } from '@prisma/client';

export function toConsultationHistoryResponse(consultation: {
  id: string;
  status: ConsultationStatus;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  cost: { toNumber?: () => number } | number | null;
  doctor: {
    name: string;
    mainSpecialty: string;
  };
}) {
  const dateSource = consultation.endedAt ?? consultation.startedAt ?? consultation.scheduledAt;
  const cost =
    consultation.cost === null || consultation.cost === undefined
      ? undefined
      : typeof consultation.cost === 'number'
        ? consultation.cost
        : consultation.cost.toNumber?.() ?? Number(consultation.cost);

  return {
    id: consultation.id,
    doctorName: consultation.doctor.name,
    specialty: consultation.doctor.mainSpecialty,
    date: dateSource ? dateSource.toISOString().split('T')[0] : undefined,
    duration: consultation.duration ?? undefined,
    cost,
    status: consultation.status === ConsultationStatus.cancelled ? 'cancelled' : 'completed',
  };
}

export function toConsultationRecordResponse(consultation: {
  id: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  doctor: {
    name: string;
    mainSpecialty: string;
  };
  medicalRecords: Array<{
    summary: string | null;
  }>;
}) {
  const dateSource = consultation.endedAt ?? consultation.startedAt ?? consultation.scheduledAt;
  const summary =
    consultation.medicalRecords.find((record) => record.summary)?.summary ??
    'Consulta realizada via telemedicina.';

  return {
    id: consultation.id,
    date: dateSource ? dateSource.toISOString().split('T')[0] : undefined,
    doctor: consultation.doctor.name,
    specialty: consultation.doctor.mainSpecialty,
    summary,
  };
}
