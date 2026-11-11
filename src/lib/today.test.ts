import { describe, expect, it } from "vitest";
import { reactivationCandidates, reviewCandidates } from "./today";

const NOW = new Date("2026-11-10T10:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const p = (id: string, consent = true, phone: string | null = "3331234567") => ({ id, phone, consent_marketing: consent });

describe("Oggi rules", () => {
  it("reactivation needs 90+ days, consent and a phone", () => {
    const appts = ["a", "b", "c", "d"].map((id) => ({ patient_id: id, start_time: daysAgo(id === "d" ? 30 : 100), status: "completed" }));
    const out = reactivationCandidates([p("a"), p("b", false), p("c", true, null), p("d")], appts, NOW).map((x) => x.id);
    expect(out).toEqual(["a"]);
  });
  it("review ready: completed within 14 days and not asked in the last 30", () => {
    const appts = ["a", "b"].map((id) => ({ patient_id: id, start_time: daysAgo(5), status: "completed" }));
    const events = [{ patient_id: "b", type: "review", sent_at: daysAgo(10) }];
    expect(reviewCandidates([p("a"), p("b")], appts, events, NOW).map((x) => x.id)).toEqual(["a"]);
  });
});
