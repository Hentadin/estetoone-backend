export const MEDICAL_RECORD_EXAM_TYPES = ['imaging', 'laboratory'] as const;
export type MedicalRecordExamType = (typeof MEDICAL_RECORD_EXAM_TYPES)[number];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface MedicalRecordInput {
  title: string;
  summary?: string;
  examType?: string;
  aiInterpretation?: string;
  documentData?: string;
  mimeType?: string;
  consultationId?: string;
}

export function validateMedicalRecordInput(input: MedicalRecordInput): string[] {
  const errors: string[] = [];

  if (!input.title?.trim()) {
    errors.push('title is required');
  }

  if (input.examType !== undefined && input.examType !== null && input.examType !== '') {
    if (!MEDICAL_RECORD_EXAM_TYPES.includes(input.examType as MedicalRecordExamType)) {
      errors.push('examType must be imaging or laboratory');
    }
  }

  if (input.documentData !== undefined && input.documentData !== null && input.documentData !== '') {
    const documentErrors = validateDocumentData(input.documentData, input.mimeType);
    errors.push(...documentErrors);
  }

  return errors;
}

export function validateDocumentData(documentData: string, mimeType?: string): string[] {
  const errors: string[] = [];

  if (!documentData.trim()) {
    errors.push('documentData must not be empty');
    return errors;
  }

  if (documentData.startsWith('data:')) {
    const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(documentData);
    if (!dataUrlMatch) {
      errors.push('documentData must be a valid data URL or HTTP(S) URL');
      return errors;
    }

    const detectedMime = dataUrlMatch[1];
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(detectedMime as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      errors.push(`document mime type must be one of: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`);
    }

    if (mimeType && mimeType !== detectedMime) {
      errors.push('mimeType must match documentData mime type');
    }

    const estimatedBytes = Math.ceil((dataUrlMatch[2].length * 3) / 4);
    if (estimatedBytes > MAX_DOCUMENT_BYTES) {
      errors.push('document must not exceed 10MB');
    }
    return errors;
  }

  try {
    const url = new URL(documentData);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push('documentData must be an HTTP(S) URL or data URL');
    }
  } catch {
    errors.push('documentData must be a valid URL');
  }

  if (mimeType && !ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    errors.push(`mimeType must be one of: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`);
  }

  return errors;
}

export function extractMimeTypeFromDocumentData(documentData: string): string | undefined {
  if (!documentData.startsWith('data:')) {
    return undefined;
  }

  const dataUrlMatch = /^data:([^;]+);base64,.+$/.exec(documentData);
  return dataUrlMatch?.[1];
}

export function toMedicalRecordResponse(record: {
  id: string;
  title: string;
  summary: string | null;
  examType: string | null;
  aiInterpretation: string | null;
  mimeType: string | null;
  uploadedAt: Date;
}) {
  return {
    id: record.id,
    date: record.uploadedAt.toISOString().split('T')[0],
    name: record.title,
    type: record.examType ?? undefined,
    results: record.summary ?? undefined,
    aiInterpretation: record.aiInterpretation ?? undefined,
    mimeType: record.mimeType ?? undefined,
    uploadedAt: record.uploadedAt.toISOString(),
  };
}

export function toMedicalRecordDetailResponse(record: {
  id: string;
  title: string;
  summary: string | null;
  examType: string | null;
  aiInterpretation: string | null;
  mimeType: string | null;
  s3Key: string | null;
  consultationId: string | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...toMedicalRecordResponse(record),
    documentUrl: record.s3Key ?? undefined,
    consultationId: record.consultationId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
