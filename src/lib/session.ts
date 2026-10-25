import type { ProgressState } from '../types';
import { todayStr } from './date';
import type { DataBundle } from './data';
import { shuffle } from './quiz';

export interface SessionPlan {
  ids: string[];
  review: number;
  fresh: number;
}

export function planSession(count: number, data: DataBundle, progress: ProgressState['words']): SessionPlan {
  const today = todayStr();
  const due: string[] = [];
  const wrong: string[] = [];
  const fresh: string[] = [];

  for (const word of data.words) {
    const record = progress[word.id];
    if (!record || record.seen === 0) fresh.push(word.id);
    else if (record.inWrongBook) wrong.push(word.id);
    else if (record.due <= today) due.push(word.id);
  }

  const duePick = shuffle(due).slice(0, count);
  const wrongPick = shuffle(wrong).slice(0, count - duePick.length);
  const freshPick = shuffle(fresh).slice(0, count - duePick.length - wrongPick.length);
  const ids = shuffle([...duePick, ...wrongPick, ...freshPick]);

  return { ids, review: duePick.length + wrongPick.length, fresh: freshPick.length };
}

export function wrongBookIds(data: DataBundle, progress: ProgressState['words']): string[] {
  return data.words.filter((w) => progress[w.id]?.inWrongBook).map((w) => w.id);
}
