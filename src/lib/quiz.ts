import type { QuizOption, Word } from '../types';
import { labelOf, POS_ORDER } from './data';
import type { DataBundle, SenseRef } from './data';

export function shuffle<T>(input: T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

function refOf(word: Word, index: number): SenseRef {
  const sense = word.senses[index];
  return { wordId: word.id, w: word.w, pos: sense.pos, cn: sense.cn, label: labelOf(sense.pos, sense.cn) };
}

function sampleDistinct(target: SenseRef, data: DataBundle, count: number): SenseRef[] {
  const picked: SenseRef[] = [];
  const ok = (c: SenseRef) =>
    c.wordId !== target.wordId &&
    c.pos !== '—' &&
    !similar(c.cn, target.cn) &&
    !picked.some((p) => similar(p.cn, c.cn));

  const samePos = shuffle(data.byPos.get(target.pos) ?? []);
  for (const candidate of samePos) {
    if (picked.length >= count) break;
    if (ok(candidate)) picked.push(candidate);
  }
  if (picked.length < count) {
    const rest = shuffle(data.senses);
    for (const candidate of rest) {
      if (picked.length >= count) break;
      if (ok(candidate)) picked.push(candidate);
    }
  }
  return picked;
}

function toOptions(correct: SenseRef, distractors: SenseRef[]): QuizOption[] {
  const all = [
    { ref: correct, correct: true },
    ...distractors.map((ref) => ({ ref, correct: false })),
  ].map((entry, i) => ({
    key: `${i}:${entry.ref.wordId}:${entry.ref.pos}:${entry.ref.cn}`,
    label: entry.ref.label,
    pos: entry.ref.pos,
    correct: entry.correct,
  }));
  return shuffle(all);
}

export function makeBasicOptions(word: Word, data: DataBundle): QuizOption[] {
  const index = Math.floor(Math.random() * word.senses.length);
  const correct = refOf(word, index);
  const distractors = sampleDistinct(correct, data, 3);
  return toOptions(correct, distractors);
}

export interface PosQuestion {
  word: Word;
  sentence: { text: string; pos: string; zh?: string };
  options: QuizOption[];
}

export function makePosOptions(correct: SenseRef, data: DataBundle): QuizOption[] {
  const positions = shuffle(
    POS_ORDER.filter((p) => p !== correct.pos && (data.byPos.get(p)?.length ?? 0) > 0),
  ).slice(0, 3);

  const distractors: SenseRef[] = [];
  for (const pos of positions) {
    const pool = shuffle(data.byPos.get(pos) ?? []).slice(0, 60);
    const hit = pool.find(
      (c) =>
        c.wordId !== correct.wordId &&
        !similar(c.cn, correct.cn) &&
        !distractors.some((d) => similar(d.cn, c.cn)),
    );
    if (hit) distractors.push(hit);
  }

  if (distractors.length < 3) {
    const used = new Set(distractors.map((d) => d.pos));
    for (const candidate of shuffle(data.senses)) {
      if (distractors.length >= 3) break;
      if (candidate.pos === correct.pos || used.has(candidate.pos)) continue;
      if (candidate.wordId === correct.wordId || similar(candidate.cn, correct.cn)) continue;
      if (distractors.some((d) => similar(d.cn, candidate.cn))) continue;
      used.add(candidate.pos);
      distractors.push(candidate);
    }
  }

  return toOptions(correct, distractors.slice(0, 3));
}

export function buildPosQuestions(data: DataBundle, count: number): PosQuestion[] {
  const candidates = shuffle(data.words);
  const out: PosQuestion[] = [];
  for (const word of candidates) {
    if (out.length >= count) break;
    const sentences = (data.sentences[word.id] ?? []).filter(
      (s) => s.text.includes('____') && word.senses.some((x) => x.pos === s.pos),
    );
    if (!sentences.length) continue;
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    const sense = word.senses.find((x) => x.pos === sentence.pos);
    if (!sense) continue;
    const correct: SenseRef = {
      wordId: word.id,
      w: word.w,
      pos: sense.pos,
      cn: sense.cn,
      label: labelOf(sense.pos, sense.cn),
    };
    out.push({
      word,
      sentence: { text: sentence.text, pos: sentence.pos, ...(sentence.zh ? { zh: sentence.zh } : {}) },
      options: makePosOptions(correct, data),
    });
  }
  return out;
}
