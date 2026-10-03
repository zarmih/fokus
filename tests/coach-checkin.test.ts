import { describe, it, expect } from 'vitest';
import { sessionCheckIn } from '../src/core/coach';

describe('sessionCheckIn', () => {
  it('returns null for null session', () => {
    expect(sessionCheckIn(null)).toBeNull();
  });

  it('low accuracy wins over short duration', () => {
    const session = {
      id: 's1',
      durationSec: 30, // short
      items: [
        { accuracy: 0.5, domain: 'memory' },
        { accuracy: 0.4, domain: 'memory' }
      ] // mean 0.45 < 0.55
    };
    const result = sessionCheckIn(session);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('rushed');
  });

  it('short duration', () => {
    const session = {
      id: 's2',
      durationSec: 40,
      items: [
        { accuracy: 0.8, domain: 'memory' },
        { accuracy: 0.9, domain: 'speed' }
      ] // mean 0.85
    };
    const result = sessionCheckIn(session);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('short');
  });

  it('familiar domain', () => {
    const session = {
      id: 's3',
      durationSec: 60,
      items: [
        { accuracy: 0.9, domain: 'attention' },
        { accuracy: 0.8, domain: 'attention' },
        { accuracy: 0.85, domain: 'memory' }
      ] // mean > 0.55, duration >= 45, attention > half
    };
    const result = sessionCheckIn(session);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('familiar');
  });

  it('a balanced accurate long session returns null', () => {
    const session = {
      id: 's4',
      durationSec: 300,
      items: [
        { accuracy: 0.9, domain: 'attention' },
        { accuracy: 0.8, domain: 'memory' },
        { accuracy: 0.85, domain: 'speed' }
      ] // mean > 0.55, duration >= 45, no domain > half
    };
    expect(sessionCheckIn(session)).toBeNull();
  });
});
