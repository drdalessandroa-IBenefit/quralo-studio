import { describe, expect, it } from "vitest";
import {
  normalizePhone, eurosToCents, isValidCF, generateReferralCode, REFERRAL_ALPHABET,
  isDormant, hadRecentCompleted, contactedWithin, buildInvoicesCsv, parseTags,
} from "./quralo";

const NOW = new Date("2026-11-07T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("normalizePhone", () => {
  it("adds 39 to a 10-digit mobile", () => expect(normalizePhone("333 123 4567")).toBe("393331234567"));
  it("strips 00 prefix", () => expect(normalizePhone("0039 333 1234567")).toBe("393331234567"));
  it("keeps +39", () => expect(normalizePhone("+39 333 1234567")).toBe("393331234567"));
  it("rejects short numbers", () => expect(normalizePhone("12345")).toBeNull());
});

describe("money", () => {
  it("converts comma euros to integer cents", () => expect(eurosToCents("77,47")).toBe(7747));
  it("rounds 0.1+0.2 style floats", () => expect(eurosToCents("19.99")).toBe(1999));
  it("rejects garbage", () => expect(eurosToCents("abc")).toBeNull());
});

describe("codice fiscale", () => {
  it("accepts standard CF", () => expect(isValidCF("RSSMRA85T10A562S")).toBe(true));
  it("accepts omocodia", () => expect(isValidCF("RSSMRALRTMLA562S")).toBe(true));
  it("rejects wrong length", () => expect(isValidCF("RSSMRA85T10A562")).toBe(false));
});

describe("referral code", () => {
  it("is QRL + 5 unambiguous chars", () => {
    const c = generateReferralCode();
    expect(c).toMatch(/^QRL.{5}$/);
    for (const ch of c.slice(3)) expect(REFERRAL_ALPHABET).toContain(ch);
    expect(REFERRAL_ALPHABET).not.toMatch(/[0O1I]/);
  });
});

describe("growth rules", () => {
  it("patient without appointments is not dormant", () => expect(isDormant([], "p", NOW)).toBe(false));
  it("last visit 100 days ago is dormant", () =>
    expect(isDormant([{ patient_id: "p", start_time: daysAgo(100), status: "completed" }], "p", NOW)).toBe(true));
  it("visit 30 days ago is not dormant", () =>
    expect(isDormant([{ patient_id: "p", start_time: daysAgo(100), status: "completed" }, { patient_id: "p", start_time: daysAgo(30), status: "completed" }], "p", NOW)).toBe(false));
  it("only-cancelled history is not dormant", () =>
    expect(isDormant([{ patient_id: "p", start_time: daysAgo(100), status: "cancelled" }], "p", NOW)).toBe(false));
  it("completed 10 days ago qualifies for review, 20 does not", () => {
    expect(hadRecentCompleted([{ patient_id: "p", start_time: daysAgo(10), status: "completed" }], "p", NOW)).toBe(true);
    expect(hadRecentCompleted([{ patient_id: "p", start_time: daysAgo(20), status: "completed" }], "p", NOW)).toBe(false);
  });
  it("dormant contacted 59 days ago is excluded, 61 is not", () => {
    expect(contactedWithin([{ patient_id: "p", type: "dormant", sent_at: daysAgo(59) }], "p", "dormant", 60, NOW)).toBe(true);
    expect(contactedWithin([{ patient_id: "p", type: "dormant", sent_at: daysAgo(61) }], "p", "dormant", 60, NOW)).toBe(false);
  });
});

describe("csv", () => {
  it("uses BOM, semicolons and it-IT amounts", () => {
    const csv = buildInvoicesCsv([{ therapistCf: "A", patientCf: "B", issuedAt: "2026-11-07", number: "2026/0001", totalCents: 8000, cashCents: 3000, posCents: 5000, stamp: true }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("A;B;07/11/2026;2026/0001;80,00;30,00;50,00;SI");
  });
});

it("tags are lowercased and deduped", () => expect(parseTags("Schiena, schiena ,Sport")).toEqual(["schiena", "sport"]));
