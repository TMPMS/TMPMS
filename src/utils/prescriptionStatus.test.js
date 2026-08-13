import { describe, it, expect } from 'vitest';
import {
  normalizePrescriptionStatus,
  getPrescriptionStatusLabel,
  getPrescriptionStatusClass,
} from './prescriptionStatus';

describe('normalizePrescriptionStatus', () => {
  it('maps legacy status names to current names', () => {
    expect(normalizePrescriptionStatus('Active')).toBe('Approved');
    expect(normalizePrescriptionStatus('Filled')).toBe('Fulfilled');
    expect(normalizePrescriptionStatus('Cancelled')).toBe('Rejected');
  });

  it('passes through already-current status names unchanged', () => {
    expect(normalizePrescriptionStatus('Pending')).toBe('Pending');
    expect(normalizePrescriptionStatus('Approved')).toBe('Approved');
  });

  it('returns empty string for falsy input', () => {
    expect(normalizePrescriptionStatus(null)).toBe('');
    expect(normalizePrescriptionStatus('')).toBe('');
  });
});

describe('getPrescriptionStatusLabel', () => {
  it('translates known statuses to Vietnamese labels', () => {
    expect(getPrescriptionStatusLabel('Pending')).toBe('Chờ duyệt');
    expect(getPrescriptionStatusLabel('Approved')).toBe('Đã duyệt');
    expect(getPrescriptionStatusLabel('Fulfilled')).toBe('Đã hoàn tất');
    expect(getPrescriptionStatusLabel('Rejected')).toBe('Đã hủy');
  });

  it('normalizes legacy status names before labeling', () => {
    expect(getPrescriptionStatusLabel('Active')).toBe('Đã duyệt');
    expect(getPrescriptionStatusLabel('Filled')).toBe('Đã hoàn tất');
  });

  it('falls back to "Không rõ" for unknown statuses', () => {
    expect(getPrescriptionStatusLabel('SomethingElse')).toBe('Không rõ');
  });
});

describe('getPrescriptionStatusClass', () => {
  it('returns the lowercase normalized status for CSS class use', () => {
    expect(getPrescriptionStatusClass('Active')).toBe('approved');
    expect(getPrescriptionStatusClass('Rejected')).toBe('rejected');
  });
});
