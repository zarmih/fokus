/**
 * Quiet Light personal-norms hint for Coach / Today.
 * Import-only surface over local-norms — no calculation rewrites.
 */

import type { Session } from './types';
import { domainLabel } from './labels';
import {
  collectAttemptSamples,
  latestPercentileLineRu,
  normsByDomain,
  normsDisclaimerRu,
  normsForDomain,
  type AttemptSample,
  type CatalogDomainRef,
  type LocalNormsOk
} from './local-norms';

/** Short domain-tagged line; falls back to latestPercentileLineRu wording. */
function formatOkLine(domain: string, result: LocalNormsOk): string {
  const base = latestPercentileLineRu(result);
  // latestPercentileLineRu already says «Лучше N% своих прошлых попыток»
  return `${domainLabel(domain)}: ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

/**
 * One quiet RU sentence when at least one domain has sufficient norms.
 * Prefers preferredDomains (Today focus), else first ok row from normsByDomain.
 * Returns null when data is insufficient — never invents ranks.
 */
export function quietPersonalNormsHintRu(
  samples: AttemptSample[],
  preferredDomains?: readonly string[] | null
): string | null {
  const prefer = (preferredDomains || []).filter(Boolean);
  for (const domain of prefer) {
    const result = normsForDomain(samples, domain);
    if (result.status === 'ok') {
      return formatOkLine(domain, result);
    }
  }
  for (const row of normsByDomain(samples)) {
    if (row.result.status === 'ok') {
      return formatOkLine(row.domain, row.result);
    }
  }
  return null;
}

/** Sessions from the same storage Progress uses + catalog domain map → hint or null. */
export function quietNormsHintFromSessions(
  sessions: Session[],
  catalog: CatalogDomainRef[],
  preferredDomains?: readonly string[] | null
): string | null {
  const samples = collectAttemptSamples(sessions, catalog, 'accuracy');
  return quietPersonalNormsHintRu(samples, preferredDomains);
}

/** Disclaimer for title/aria — not shown as a second visible sentence. */
export function quietNormsHintDisclaimerRu(): string {
  return normsDisclaimerRu();
}
