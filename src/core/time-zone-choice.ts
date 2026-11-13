import type { Profile } from './types';
import { PREFERRED_TIME_ZONE, timeZoneSupported, withZoneChange, type ZonePeriod } from './streak';

/** A short list that covers most users; the device zone and the current zone are always added. */
export const COMMON_ZONES = [
  'Pacific/Honolulu', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Sao_Paulo', 'Atlantic/Reykjavik', 'Europe/London', 'Europe/Berlin', 'Europe/Kyiv', 'Europe/Istanbul',
  'Europe/Moscow', 'Asia/Dubai', 'Asia/Tbilisi', 'Asia/Yerevan', 'Asia/Almaty', 'Asia/Tashkent',
  'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
  'Asia/Vladivostok', 'Australia/Sydney', 'Pacific/Auckland'
] as const;

/** UTC offset in minutes of `zone` at `atMs` (handles DST). */
export function zoneOffsetMinutes(zone: string, atMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(atMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(atMs / 1000) * 1000) / 60000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

export function zoneLabel(zone: string, atMs: number): string {
  const city = (zone.split('/').pop() || zone).replace(/_/g, ' ');
  return `${city} (${formatOffset(zoneOffsetMinutes(zone, atMs))})`;
}

export function zoneOptions(device: string | null, current: string | null, atMs: number): { zone: string; label: string }[] {
  const set = new Set<string>(COMMON_ZONES.filter((z) => timeZoneSupported(z)));
  if (device && timeZoneSupported(device)) set.add(device);
  if (current && timeZoneSupported(current)) set.add(current);
  return [...set]
    .map((zone) => ({ zone, off: zoneOffsetMinutes(zone, atMs), label: zoneLabel(zone, atMs) }))
    .sort((a, b) => a.off - b.off || a.zone.localeCompare(b.zone))
    .map(({ zone, label }) => ({ zone, label }));
}

/** The zone days are counted in right now for this profile. */
export function profileZone(profile: Pick<Profile, 'timeZones'>): string {
  const list = profile.timeZones || [];
  return list.length ? list[list.length - 1].zone : PREFERRED_TIME_ZONE;
}

/** Offer the device zone when it differs from the zone in use (never switch silently). */
export function zoneSuggestion(profile: Pick<Profile, 'timeZones'>, device: string | null): string | null {
  if (!device || !timeZoneSupported(device)) return null;
  return device === profileZone(profile) ? null : device;
}

/** Initial zone for a brand-new profile: the device zone (no history to re-date). */
export function initialZones(device: string | null): ZonePeriod[] {
  return [{ zone: device && timeZoneSupported(device) ? device : PREFERRED_TIME_ZONE, fromMs: 0 }];
}

/** Switch zone from `atMs` on; earlier days keep their dates. */
export function changeZone(profile: Profile, zone: string, atMs: number): Profile {
  return { ...profile, timeZones: withZoneChange(profile.timeZones, zone, atMs) };
}
