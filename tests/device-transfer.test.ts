import { describe, it, expect } from 'vitest';
import { fileTransferFromBackup, qrChunksFromBackup, assembleQrChunks, qrSvg, importTransferText } from '../src/core/device-transfer';
import { serializeBackup, parseBackup } from '../src/core/offline-sync';
import type { AppState } from '../src/core/types';

describe('device-transfer', () => {
  const mockState: AppState = {
    profile: {
      name: 'Test',
      xp: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 4,
      locale: 'ru',
      sessionLengthSec: 300,
      soundOn: true
    },
    meta: {
      schemaVersion: 4,
      deviceId: 'test-dev',
      rev: 1,
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    sessions: [],
    daySummaries: [],
    history: [],
    exerciseStates: [],
    skills: [],
    domains: []
  };

  const validRawBackup = serializeBackup(mockState);

  it('fileTransferFromBackup roundtrips file body through parseBackup', () => {
    const result = fileTransferFromBackup(validRawBackup);
    expect(result.ok).toBe(true);
    if (!result.ok) return; // for typescript
    expect(result.filename).toBe('fokus-backup.json');
    const parseResult = parseBackup(result.body);
    expect(parseResult.ok).toBe(true);
  });

  it('qr chunks reassemble in shuffled order to the exact body and parseBackup ok', () => {
    const chunkRes = qrChunksFromBackup(validRawBackup);
    expect(chunkRes.ok).toBe(true);
    if (!chunkRes.ok) return;

    expect(chunkRes.chunks.length).toBeGreaterThan(0);
    const shuffled = [...chunkRes.chunks].reverse();
    const assembleRes = assembleQrChunks(shuffled);

    expect(assembleRes.ok).toBe(true);
    if (!assembleRes.ok) return;
    expect(assembleRes.body).toBe(chunkRes.body);

    const parseRes = parseBackup(assembleRes.body);
    expect(parseRes.ok).toBe(true);
  });

  it('single-chunk and multi-chunk', () => {
    // Single chunk
    const singleRes = qrChunksFromBackup(validRawBackup);
    expect(singleRes.ok).toBe(true);
    if (!singleRes.ok) return;
    expect(singleRes.chunks.length).toBe(1);

    // Multi chunk - force large body
    const largeState = JSON.parse(JSON.stringify(mockState)) as AppState;
    for (let i = 0; i < 100; i++) {
      largeState.history.push({ date: `2026-01-01T00:00:${i < 10 ? '0' + i : i}Z`, score: i, minutes: 2, accuracy: 1, domainDeltas: {} });
    }
    const largeRaw = serializeBackup(largeState);
    const multiRes = qrChunksFromBackup(largeRaw);
    expect(multiRes.ok).toBe(true);
    if (!multiRes.ok) return;
    expect(multiRes.chunks.length).toBeGreaterThan(1);
    const assembleMulti = assembleQrChunks(multiRes.chunks);
    expect(assembleMulti.ok).toBe(true);
  });

  it('garbage, wrong prefix, missing part, duplicate part fail assembleQrChunks', () => {
    const chunkRes = qrChunksFromBackup(validRawBackup);
    if (!chunkRes.ok) throw new Error('Failed to get chunks');
    const chunks = chunkRes.chunks;

    expect(assembleQrChunks(['garbage']).ok).toBe(false);
    expect(assembleQrChunks([chunks[0].replace('FOKUSQR1', 'FOKUSQR2')]).ok).toBe(false);

    // Force multi-chunk for missing part test
    const largeState = JSON.parse(JSON.stringify(mockState)) as AppState;
    for (let i = 0; i < 100; i++) largeState.history.push({ date: `1-${i}`, score: i, minutes: 2, accuracy: 1, domainDeltas: {} });
    const largeRaw = serializeBackup(largeState);
    const multi = qrChunksFromBackup(largeRaw);
    if (!multi.ok) throw new Error('Multi failed');
    const multiChunks = multi.chunks;

    expect(assembleQrChunks(multiChunks.slice(1)).ok).toBe(false);
    expect(assembleQrChunks([...multiChunks, multiChunks[0]]).ok).toBe(false);
  });

  it('importTransferText merge works on assembled body', () => {
    const multi = qrChunksFromBackup(validRawBackup);
    if (!multi.ok) throw new Error('Failed to get chunks');
    const text = multi.chunks.join('\n\n');
    const res = importTransferText(mockState, text, 'merge');
    if (!res.ok) console.log(res);
    expect(res.ok).toBe(true);
  });

  it('qrSvg returns a string containing <svg and differs for two payloads', () => {
    const svg1 = qrSvg('FOKUSQR1|1|1|test1');
    const svg2 = qrSvg('FOKUSQR1|1|1|test2');
    expect(svg1).toContain('<svg');
    expect(svg2).toContain('<svg');
    expect(svg1).not.toBe(svg2);
  });
});
