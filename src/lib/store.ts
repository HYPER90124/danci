import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mode, ProgressState, SessionStat, Settings, WordProgress } from '../types';
import { addDays, todayStr } from './date';
import { intervalFor, nextStage } from './srs';

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    settings: { dailyGoal: 30, theme: 'auto' },
    words: {},
    daily: {},
    sessions: [],
    posStats: {},
    streak: { current: 0, best: 0, lastDate: '' },
  };
}

interface Actions {
  answer: (wordId: string, pos: string, correct: boolean, ms: number) => void;
  addToWrongBook: (wordId: string) => void;
  removeFromWrongBook: (wordId: string) => void;
  logSession: (session: SessionStat) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (state: ProgressState) => void;
  resetAll: () => void;
}

export type StoreState = ProgressState & Actions;

const blankWord = (today: string): WordProgress => ({
  seen: 0,
  correct: 0,
  wrong: 0,
  inWrongBook: false,
  stage: 0,
  due: today,
  last: today,
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...emptyProgress(),

      answer: (wordId, pos, correct, ms) => {
        const state = get();
        const today = todayStr();
        const prev = state.words[wordId] ?? blankWord(today);
        const isNew = prev.seen === 0;
        const stage = nextStage(prev.stage, correct);
        const updated: WordProgress = {
          seen: prev.seen + 1,
          correct: prev.correct + (correct ? 1 : 0),
          wrong: prev.wrong + (correct ? 0 : 1),
          inWrongBook: prev.inWrongBook,
          stage,
          due: addDays(today, intervalFor(stage)),
          last: today,
        };

        const day = state.daily[today] ?? { newWords: 0, review: 0, correct: 0, total: 0, ms: 0 };
        const nextDay = {
          newWords: day.newWords + (isNew ? 1 : 0),
          review: day.review + (isNew ? 0 : 1),
          correct: day.correct + (correct ? 1 : 0),
          total: day.total + 1,
          ms: day.ms + Math.max(0, ms || 0),
        };

        const posStats = { ...state.posStats };
        if (pos && pos !== '—') {
          const bucket = posStats[pos] ?? { correct: 0, total: 0 };
          posStats[pos] = { correct: bucket.correct + (correct ? 1 : 0), total: bucket.total + 1 };
        }

        let streak = state.streak;
        if (streak.lastDate !== today) {
          const continues = Boolean(streak.lastDate) && addDays(streak.lastDate, 1) === today;
          const current = continues ? streak.current + 1 : 1;
          streak = { current, best: Math.max(streak.best, current), lastDate: today };
        }

        set({
          words: { ...state.words, [wordId]: updated },
          daily: { ...state.daily, [today]: nextDay },
          posStats,
          streak,
        });
      },

      addToWrongBook: (wordId) => {
        const state = get();
        const today = todayStr();
        const prev = state.words[wordId] ?? blankWord(today);
        if (prev.inWrongBook) return;
        set({ words: { ...state.words, [wordId]: { ...prev, inWrongBook: true } } });
      },

      removeFromWrongBook: (wordId) => {
        const state = get();
        const prev = state.words[wordId];
        if (!prev) return;
        set({ words: { ...state.words, [wordId]: { ...prev, inWrongBook: false } } });
      },

      logSession: (session) => {
        const state = get();
        set({ sessions: [...state.sessions, session].slice(-400) });
      },

      updateSettings: (patch) => {
        const state = get();
        set({ settings: { ...state.settings, ...patch } });
      },

      replaceAll: (incoming) => {
        const base = emptyProgress();
        set({
          ...base,
          ...incoming,
          settings: { ...base.settings, ...(incoming.settings ?? {}) },
          words: incoming.words ?? {},
          daily: incoming.daily ?? {},
          sessions: incoming.sessions ?? [],
          posStats: incoming.posStats ?? {},
          streak: { ...base.streak, ...(incoming.streak ?? {}) },
        });
      },

      resetAll: () => set(emptyProgress()),
    }),
    {
      name: 'cet4-progress-v1',
      version: 1,
      partialize: (s) => ({
        version: s.version,
        settings: s.settings,
        words: s.words,
        daily: s.daily,
        sessions: s.sessions,
        posStats: s.posStats,
        streak: s.streak,
      }),
    },
  ),
);

export type { Mode };
