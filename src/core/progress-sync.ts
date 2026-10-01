/**
 * Progress sync foundation — local-first, account-ready later.
 *
 * Today: export/import (+ clipboard) is the MVP transfer between devices.
 * Next: pluggable CloudSyncTransport; no auth secrets in the client yet.
 */

import {
  CURRENT_BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
  parseBackup,
  applyImport,
  setSyncPoster,
  type ImportMode,
  type SyncStatus
} from './offline-sync';
import type { AppState } from './types';

export const CLOUD_SYNC_DESIGN_VERSION = 1;

export type CloudSyncPhase = 'local_only' | 'export_import' | 'queued_transport' | 'account';

export interface CloudSyncDesign {
  version: number;
  phase: CloudSyncPhase;
  local: {
    envelope: 'fokus-backup';
    schemaVersion: number;
    backupFormat: number;
    mergeModes: ImportMode[];
    clipboardSupported: boolean;
  };
  cloudNext: {
    transport: 'https-json';
    endpointPath: '/api/sync';
    auth: 'bearer-token-not-shipped';
    identity: 'deviceId + rev from meta';
    conflict: 'rev-wins merge via mergeStates';
    secretsNote: string;
  };
}

export function progressSyncDesign(): CloudSyncDesign {
  return {
    version: CLOUD_SYNC_DESIGN_VERSION,
    phase: 'export_import',
    local: {
      envelope: 'fokus-backup',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      backupFormat: CURRENT_BACKUP_FORMAT,
      mergeModes: ['merge', 'replace'],
      clipboardSupported: true
    },
    cloudNext: {
      transport: 'https-json',
      endpointPath: '/api/sync',
      auth: 'bearer-token-not-shipped',
      identity: 'deviceId + rev from meta',
      conflict: 'rev-wins merge via mergeStates',
      secretsNote:
        'No client secrets. Token would live in fokus.auth (future) after OAuth/magic-link.'
    }
  };
}

export function syncStatusBlurb(status: SyncStatus, design = progressSyncDesign()): string {
  if (design.phase === 'export_import' || design.phase === 'local_only') {
    return 'Синхронизация аккаунта пока локальная: экспорт/импорт JSON между устройствами. Облако — следующий шаг; секретов в клиенте нет.';
  }
  if (status.state === 'queued') {
    return `В очереди ${status.pendingCount} изменений для будущей облачной отправки.`;
  }
  if (status.state === 'error') {
    return 'Последняя попытка облачной синхронизации не удалась. Локальные данные на месте — можно экспортировать файл.';
  }
  if (status.state === 'syncing') return 'Идёт синхронизация…';
  if (status.state === 'offline') return 'Офлайн — очередь сохранится на устройстве.';
  return 'Локальная копия актуальна.';
}

export function designSummaryRu(design = progressSyncDesign()): string {
  return [
    `Фаза: ${design.phase} (дизайн v${design.version}).`,
    `Конверт ${design.local.envelope}, схема ${design.local.schemaVersion}, format ${design.local.backupFormat}.`,
    `Режимы импорта: ${design.local.mergeModes.join(', ')}.`,
    `Облако next: ${design.cloudNext.endpointPath}, идентичность «${design.cloudNext.identity}», конфликт «${design.cloudNext.conflict}».`,
    design.cloudNext.secretsNote
  ].join(' ');
}

/** Validate a storage.exportJson() (or paste) before clipboard share. */
export function backupForClipboard(
  rawExportJson: string
): { ok: true; text: string } | { ok: false; error: string } {
  const parsed = parseBackup(rawExportJson);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  // Prefer canonical pretty text for human paste between phones.
  try {
    const obj = JSON.parse(rawExportJson);
    return { ok: true, text: JSON.stringify(obj, null, 2) };
  } catch {
    return { ok: true, text: rawExportJson };
  }
}

export function importFromClipboardText(
  local: AppState,
  text: string,
  mode: ImportMode = 'merge'
): ReturnType<typeof applyImport> {
  return applyImport(local, text, mode);
}

export interface CloudSyncTransport {
  push(batch: unknown[], signal?: AbortSignal): Promise<{ ok: boolean; status?: number }>;
}

/** Default transport: honest 501 — no cloud backend / no secrets. */
export const noopCloudTransport: CloudSyncTransport = {
  async push() {
    return { ok: false, status: 501 };
  }
};

let activeTransport: CloudSyncTransport = noopCloudTransport;

export function setCloudSyncTransport(t: CloudSyncTransport) {
  activeTransport = t;
}

export function getCloudSyncTransport(): CloudSyncTransport {
  return activeTransport;
}

export async function pushViaTransport(batch: unknown[], signal?: AbortSignal) {
  return activeTransport.push(batch, signal);
}


/** Install noop cloud poster so SyncQueue does not pretend a real account API exists. */
export function installProgressSyncBridge() {
  setSyncPoster(async (snapshot, signal) => {
    const result = await pushViaTransport(snapshot, signal);
    if (!result.ok) return null;
    return new Response(null, { status: result.status ?? 200 });
  });
}
