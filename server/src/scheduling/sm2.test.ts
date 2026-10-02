import { INITIAL_SCHEDULING_STATE, scheduleNext } from "./sm2";

describe("scheduleNext (SM-2)", () => {
  it("produces the canonical interval sequence [1, 6, 15, 38] for repeated quality-4 reviews, with ease factor unchanged", () => {
    // quality 4 is the textbook case where ease factor is left exactly
    // unchanged: 0.1 - (5-4)*(0.08 + (5-4)*0.02) = 0.1 - 1*0.10 = 0.
    let state = INITIAL_SCHEDULING_STATE;
    const now = new Date("2026-01-01T00:00:00.000Z");

    const r1 = scheduleNext(state, 4, now);
    expect(r1.intervalDays).toBe(1);
    expect(r1.easeFactor).toBeCloseTo(2.5, 5);
    state = r1;

    const r2 = scheduleNext(state, 4, now);
    expect(r2.intervalDays).toBe(6);
    expect(r2.easeFactor).toBeCloseTo(2.5, 5);
    state = r2;

    const r3 = scheduleNext(state, 4, now);
    expect(r3.intervalDays).toBe(15); // round(6 * 2.5)
    expect(r3.easeFactor).toBeCloseTo(2.5, 5);
    state = r3;

    const r4 = scheduleNext(state, 4, now);
    expect(r4.intervalDays).toBe(38); // round(15 * 2.5) = round(37.5)
    expect(r4.easeFactor).toBeCloseTo(2.5, 5);
  });

  it("increases ease factor for quality 5, decreases it for quality 3", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const up = scheduleNext(INITIAL_SCHEDULING_STATE, 5, now);
    expect(up.easeFactor).toBeCloseTo(2.6, 5); // +0.1

    const down = scheduleNext(INITIAL_SCHEDULING_STATE, 3, now);
    expect(down.easeFactor).toBeCloseTo(2.36, 5); // 2.5 - 0.14
  });

  it("resets repetitions and interval to 1 day on a failed recall (quality < 3), without resetting ease factor", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    // Build up some streak first.
    let state = scheduleNext(INITIAL_SCHEDULING_STATE, 5, now);
    state = scheduleNext(state, 5, now);
    expect(state.repetitions).toBe(2);

    const failed = scheduleNext(state, 1, now);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
    // Ease factor still moves per the formula, it just isn't reset to a
    // fixed value the way repetitions/interval are.
    expect(failed.easeFactor).toBeLessThan(state.easeFactor);
  });

  it("never lets ease factor drop below 1.3, even after many failures", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    let state = INITIAL_SCHEDULING_STATE;
    for (let i = 0; i < 20; i++) {
      state = scheduleNext(state, 0, now);
    }
    expect(state.easeFactor).toBeCloseTo(1.3, 5);
  });

  it("computes nextReviewDate as `now` plus intervalDays", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const result = scheduleNext(INITIAL_SCHEDULING_STATE, 4, now);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewDate).toBe("2026-03-11T12:00:00.000Z");
  });

  it("rejects an out-of-range or non-integer quality", () => {
    expect(() => scheduleNext(INITIAL_SCHEDULING_STATE, -1)).toThrow();
    expect(() => scheduleNext(INITIAL_SCHEDULING_STATE, 6)).toThrow();
    expect(() => scheduleNext(INITIAL_SCHEDULING_STATE, 2.5)).toThrow();
  });
});
