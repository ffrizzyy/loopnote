/**
 * Classic SM-2 (SuperMemo 2) scheduling, as originally specified. quality
 * is a 0–5 recall-quality rating (5 = perfect recall, <3 = failed recall
 * and resets the streak).
 */

export interface SchedulingState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface ScheduledResult extends SchedulingState {
  nextReviewDate: string;
}

export const INITIAL_SCHEDULING_STATE: SchedulingState = {
  repetitions: 0,
  intervalDays: 0,
  easeFactor: 2.5,
};

const MIN_EASE_FACTOR = 1.3;

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function scheduleNext(state: SchedulingState, quality: number, now: Date = new Date()): ScheduledResult {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error("quality must be an integer from 0 to 5");
  }

  let { repetitions, intervalDays } = state;
  let easeFactor = state.easeFactor;

  if (quality < 3) {
    // Failed recall: start the streak over. Per SM-2, a failure doesn't
    // reset ease — only consistently-hard cards should get easier.
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

  return {
    repetitions,
    intervalDays,
    easeFactor,
    nextReviewDate: addDays(now, intervalDays).toISOString(),
  };
}
