import type { WordProgress } from '../types';
import { todayStr } from './date';

export interface Totals {
  total: number;
  learned: number;
  mastered: number;
  wrongBook: number;
  dueToday: number;
  correct: number;
  attempts: number;
  accuracy: number;
}

export function computeTotals(words: Record<string, WordProgress>, wordCount: number): Totals {
  const today = todayStr();
  let learned = 0;
  let mastered = 0;
  let wrongBook = 0;
  let dueToday = 0;
  let correct = 0;
  let attempts = 0;

  for (const record of Object.values(words)) {
    if (record.seen > 0) learned += 1;
    if (record.stage >= 3) mastered += 1;
    if (record.inWrongBook) wrongBook += 1;
    if (record.seen > 0 && !record.inWrongBook && record.due <= today) dueToday += 1;
    correct += record.correct;
    attempts += record.seen;
  }

  return {
    total: wordCount,
    learned,
    mastered,
    wrongBook,
    dueToday,
    correct,
    attempts,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
  };
}
