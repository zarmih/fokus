// @ts-ignore - Local JS library
import QRCode from './qrcode.js';
import { parseBackup, type ImportMode } from './offline-sync';
import { backupForClipboard, importFromClipboardText } from './progress-sync';
import type { AppState } from './types';

export function fileTransferFromBackup(raw: string): { ok: true; filename: string; body: string } | { ok: false; error: string } {
  const parsed = parseBackup(raw);
  if (!parsed.ok) return parsed;
  const clipboard = backupForClipboard(raw);
  const body = clipboard.ok ? clipboard.text : raw;
  return { ok: true, filename: 'fokus-backup.json', body };
}

export function qrChunksFromBackup(raw: string): { ok: true; chunks: string[]; body: string } | { ok: false; error: string } {
  const fileRes = fileTransferFromBackup(raw);
  if (!fileRes.ok) return fileRes;
  const body = fileRes.body;
  
  const prefixBase = 'FOKUSQR1|';
  const maxChunkLen = 900;
  const pieceSize = 850;
  
  const pieces: string[] = [];
  for (let i = 0; i < body.length; i += pieceSize) {
    pieces.push(body.substring(i, i + pieceSize));
  }
  
  const total = pieces.length;
  if (total === 0) {
    return { ok: false, error: 'empty_body' };
  }
  
  const chunks = pieces.map((p, i) => {
    return `${prefixBase}${i + 1}|${total}|${p}`;
  });
  
  for (const c of chunks) {
    if (c.length > maxChunkLen) {
      return { ok: false, error: 'chunk_too_large' };
    }
  }
  
  return { ok: true, chunks, body };
}

export function assembleQrChunks(chunks: string[]): { ok: true; body: string } | { ok: false; error: string } {
  if (!chunks || chunks.length === 0) return { ok: false, error: 'empty_chunks' };
  
  const parts = new Map<number, string>();
  let totalParts = -1;
  
  for (const c of chunks) {
    if (!c.startsWith('FOKUSQR1|')) return { ok: false, error: 'bad_prefix' };
    
    const idx1 = c.indexOf('|');
    const idx2 = c.indexOf('|', idx1 + 1);
    const idx3 = c.indexOf('|', idx2 + 1);
    
    if (idx1 === -1 || idx2 === -1 || idx3 === -1) return { ok: false, error: 'bad_format' };
    
    const indexStr = c.substring(idx1 + 1, idx2);
    const totalStr = c.substring(idx2 + 1, idx3);
    const piece = c.substring(idx3 + 1);
    
    const index = parseInt(indexStr, 10);
    const total = parseInt(totalStr, 10);
    
    if (isNaN(index) || isNaN(total) || index < 1 || total < 1 || index > total) {
      return { ok: false, error: 'bad_index' };
    }
    
    if (totalParts === -1) {
      totalParts = total;
    } else if (totalParts !== total) {
      return { ok: false, error: 'total_mismatch' };
    }
    
    if (parts.has(index)) {
      if (parts.get(index) !== piece) {
        return { ok: false, error: 'duplicate_mismatch' };
      }
      return { ok: false, error: 'duplicate_index' };
    }
    
    parts.set(index, piece);
  }
  
  if (totalParts === -1 || parts.size !== totalParts) {
    return { ok: false, error: 'missing_part' };
  }
  
  let body = '';
  for (let i = 1; i <= totalParts; i++) {
    if (!parts.has(i)) return { ok: false, error: 'missing_part' };
    body += parts.get(i);
  }
  
  const parsed = parseBackup(body);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  
  return { ok: true, body };
}

export function qrSvg(text: string): string {
  // @ts-ignore - The types for qrcode-svg are not available
  const qrcode = new QRCode({
    content: text,
    padding: 1,
    width: 256,
    height: 256,
    color: '#000000',
    background: '#ffffff',
    ecl: 'M'
  });
  return qrcode.svg();
}

export function importTransferText(localState: AppState, text: string, mode: ImportMode = 'merge') {
  if (text.includes('FOKUSQR1|')) {
    const chunks: string[] = [];
    let currentIndex = text.indexOf('FOKUSQR1|');
    while (currentIndex !== -1) {
      const nextIndex = text.indexOf('FOKUSQR1|', currentIndex + 9);
      if (nextIndex !== -1) {
        chunks.push(text.substring(currentIndex, nextIndex).trim());
        currentIndex = nextIndex;
      } else {
        chunks.push(text.substring(currentIndex).trim());
        break;
      }
    }
    const assembled = assembleQrChunks(chunks);
    if (!assembled.ok) return assembled;
    return importFromClipboardText(localState, assembled.body, mode);
  }
  
  return importFromClipboardText(localState, text, mode);
}
