import type { SentenceBank, Word, WordData } from '../types';

export const POS_ORDER = [
  'n.',
  'v.',
  'adj.',
  'adv.',
  'prep.',
  'conj.',
  'pron.',
  'num.',
  'art.',
  'int.',
  'aux.',
] as const;

export interface SenseRef {
  wordId: string;
  w: string;
  pos: string;
  cn: string;
  label: string;
}

export interface DataBundle {
  words: Word[];
  byId: Map<string, Word>;
  sentences: SentenceBank;
  senses: SenseRef[];
  byPos: Map<string, SenseRef[]>;
  coreByPos: Map<string, SenseRef[]>;
}

const CONTENT_POS = new Set(['n.', 'v.', 'adj.', 'adv.']);

export function labelOf(pos: string, cn: string): string {
  return pos && pos !== '—' ? `${pos} ${cn}` : cn;
}

export function makeSenseRef(wordId: string, w: string, pos: string, cn: string): SenseRef {
  return { wordId, w, pos, cn, label: labelOf(pos, cn) };
}

export async function loadData(): Promise<DataBundle> {
  const base = import.meta.env.BASE_URL;
  const [wordsRes, sentencesRes] = await Promise.all([
    fetch(`${base}data/words.json`),
    fetch(`${base}data/sentences.json`),
  ]);
  if (!wordsRes.ok) throw new Error(`词库加载失败：HTTP ${wordsRes.status}`);
  const wordData = (await wordsRes.json()) as WordData;
  const sentences = sentencesRes.ok ? ((await sentencesRes.json()) as SentenceBank) : {};

  const byId = new Map<string, Word>();
  for (const word of wordData.words) byId.set(word.id, word);

  const senses: SenseRef[] = [];
  const byPos = new Map<string, SenseRef[]>();
  const coreByPos = new Map<string, SenseRef[]>();
  for (const word of wordData.words) {
    for (const sense of word.senses) {
      const ref = makeSenseRef(word.id, word.w, sense.pos, sense.cn);
      senses.push(ref);
      const bucket = byPos.get(sense.pos);
      if (bucket) bucket.push(ref);
      else byPos.set(sense.pos, [ref]);
    }

    if (word.core && !word.w.includes('/') && !word.w.includes(' ')) {
      const posSet = new Set(word.senses.map((s) => s.pos).filter((p) => p !== '—'));
      if (posSet.size === 1) {
        const pos = [...posSet][0];
        if (CONTENT_POS.has(pos)) {
          const first = word.senses.find((s) => s.pos === pos);
          if (first) {
            const ref = makeSenseRef(word.id, word.w, pos, first.cn);
            const bucket = coreByPos.get(pos);
            if (bucket) bucket.push(ref);
            else coreByPos.set(pos, [ref]);
          }
        }
      }
    }
  }

  return { words: wordData.words, byId, sentences, senses, byPos, coreByPos };
}
