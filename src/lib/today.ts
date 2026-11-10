import { contactedWithin, hadRecentCompleted, isDormant, normalizePhone, type ApptLite, type EventLite } from "./quralo";

interface PatientLite { id: string; phone: string | null; consent_marketing: boolean }

const reachablePhone = (phone: string | null) => /^\d{11,15}$/.test(normalizePhone(phone) ?? "");

/** Dormant patients (default 90 days) with marketing consent and a valid phone: same rule as the Growth engine. */
export function reactivationCandidates<P extends PatientLite>(patients: P[], appts: ApptLite[], now = Date.now(), days = 90): P[] {
  return patients.filter((p) => isDormant(appts, p.id, now, days) && p.consent_marketing && reachablePhone(p.phone));
}

/** Completed visit in the last 14 days, consent given, not asked for a review in the last 30 days. */
export function reviewCandidates<P extends PatientLite>(patients: P[], appts: ApptLite[], events: EventLite[], now = Date.now()): P[] {
  return patients.filter((p) => hadRecentCompleted(appts, p.id, now) && p.consent_marketing && !contactedWithin(events, p.id, "review", 30, now));
}

export function dayBounds(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start, end };
}
