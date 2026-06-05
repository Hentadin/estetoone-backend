import { ConsultationStatus } from '@prisma/client';
import {
  buildMockRoomUrl,
  validateScheduleConsultation,
  validateStatusTransition,
} from '../../src/domain/models/consultation.model';

describe('consultation.model', () => {
  describe('validateScheduleConsultation', () => {
    it('accepts valid future schedule', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(
        validateScheduleConsultation({
          doctorId: 'doctor-1',
          scheduledAt: future,
        }),
      ).toEqual([]);
    });

    it('rejects past schedule', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const errors = validateScheduleConsultation({
        doctorId: 'doctor-1',
        scheduledAt: past,
      });
      expect(errors).toContain('scheduledAt must be in the future');
    });

    it('rejects missing doctorId', () => {
      const errors = validateScheduleConsultation({
        doctorId: '',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(errors).toContain('doctorId is required');
    });
  });

  describe('validateStatusTransition', () => {
    it('allows waiting to active', () => {
      expect(
        validateStatusTransition(ConsultationStatus.waiting, ConsultationStatus.active),
      ).toEqual([]);
    });

    it('rejects completed to active', () => {
      const errors = validateStatusTransition(
        ConsultationStatus.completed,
        ConsultationStatus.active,
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('buildMockRoomUrl', () => {
    it('returns mock daily room url', () => {
      expect(buildMockRoomUrl('abc-123')).toBe('https://mock.daily.co/room-abc-123');
    });
  });
});
