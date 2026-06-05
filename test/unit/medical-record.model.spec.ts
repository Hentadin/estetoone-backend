import {
  validateDocumentData,
  validateMedicalRecordInput,
} from '../../src/domain/models/medical-record.model';

describe('medical-record.model', () => {
  describe('validateMedicalRecordInput', () => {
    it('accepts valid record without document', () => {
      const errors = validateMedicalRecordInput({
        title: 'Hemograma Completo',
        examType: 'laboratory',
        summary: 'Normal results',
      });

      expect(errors).toEqual([]);
    });

    it('rejects missing title', () => {
      const errors = validateMedicalRecordInput({
        title: '',
        examType: 'laboratory',
      });

      expect(errors).toContain('title is required');
    });

    it('rejects invalid exam type', () => {
      const errors = validateMedicalRecordInput({
        title: 'Exam',
        examType: 'invalid',
      });

      expect(errors).toContain('examType must be imaging or laboratory');
    });
  });

  describe('validateDocumentData', () => {
    it('accepts valid PDF data URL', () => {
      const errors = validateDocumentData('data:application/pdf;base64,YWJj');

      expect(errors).toEqual([]);
    });

    it('rejects unsupported mime type', () => {
      const errors = validateDocumentData('data:text/plain;base64,YWJj');

      expect(errors[0]).toContain('document mime type must be one of');
    });

    it('rejects oversized document', () => {
      const largePayload = 'a'.repeat(14_000_000);
      const errors = validateDocumentData(`data:application/pdf;base64,${largePayload}`);

      expect(errors).toContain('document must not exceed 10MB');
    });
  });
});
