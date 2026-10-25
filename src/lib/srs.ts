export const INTERVALS = [1, 3, 7, 15, 30, 60];

export function nextStage(stage: number, correct: boolean): number {
  if (correct) return Math.min(stage + 1, INTERVALS.length - 1);
  return Math.max(0, stage - 1);
}

export function intervalFor(stage: number): number {
  return INTERVALS[Math.min(Math.max(stage, 0), INTERVALS.length - 1)];
}
