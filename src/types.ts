export type Pos =
  | 'n.'
  | 'v.'
  | 'adj.'
  | 'adv.'
  | 'prep.'
  | 'conj.'
  | 'pron.'
  | 'num.'
  | 'art.'
  | 'int.'
  | 'aux.'
  | '—';

export interface Sense {
  pos: string;
  cn: string;
}

export interface Word {
  id: string;
  w: string;
  phon?: string;
  rank: number;
  senses: Sense[];
  src: 'ecdict' | 'override' | 'supplement';
}

export interface WordData {
  version: number;
  words: Word[];
}

export interface Sentence {
  text: string;
  pos: string;
  src: 'tatoeba' | 'template';
  zh?: string;
}

export type SentenceBank = Record<string, Sentence[]>;

export type Mode = 'basic' | 'pos' | 'wrong';

export interface WordProgress {
  seen: number;
  correct: number;
  wrong: number;
  inWrongBook: boolean;
  stage: number;
  due: string;
  last: string;
}

export interface DayStat {
  newWords: number;
  review: number;
  correct: number;
  total: number;
  ms: number;
}

export interface SessionStat {
  date: string;
  mode: Mode;
  total: number;
  correct: number;
  ms: number;
}

export interface Settings {
  dailyGoal: number;
  theme: 'auto' | 'light' | 'dark';
}

export interface ProgressState {
  version: 1;
  settings: Settings;
  words: Record<string, WordProgress>;
  daily: Record<string, DayStat>;
  sessions: SessionStat[];
  posStats: Record<string, { correct: number; total: number }>;
  streak: { current: number; best: number; lastDate: string };
}

export interface QuizOption {
  key: string;
  label: string;
  pos: string;
  correct: boolean;
}
