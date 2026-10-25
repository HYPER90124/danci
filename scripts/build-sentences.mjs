import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WORDS = path.join(root, 'public', 'data', 'words.json');
const TEMPLATES = path.join(root, 'data', 'templates.json');
const REAL = path.join(root, 'data', 'sentences-real.json');
const OUT = path.join(root, 'public', 'data', 'sentences.json');

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const { words } = JSON.parse(fs.readFileSync(WORDS, 'utf8'));
const templates = JSON.parse(fs.readFileSync(TEMPLATES, 'utf8'));
const real = readJson(REAL, {});
const bank = {};
let fromReal = 0;
let fromTemplate = 0;
const uncovered = [];

for (const word of words) {
  const own = Array.isArray(real[word.id]) ? real[word.id].slice(0, 2) : [];
  const list = [];
  for (const s of own) {
    if (s && s.text && s.text.includes('____')) list.push({ text: s.text, pos: s.pos, src: 'tatoeba', ...(s.zh ? { zh: s.zh } : {}) });
  }

  if (list.length) {
    fromReal++;
  } else {
    const sense = word.senses.find((s) => templates[s.pos] && templates[s.pos].length);
    if (!sense) { uncovered.push(word.w); continue; }
    const pool = templates[sense.pos];
    const h = hash(word.id);
    const picks = [pool[h % pool.length], pool[(h + 3) % pool.length]].filter((v, i, a) => a.indexOf(v) === i);
    for (const text of picks) list.push({ text, pos: sense.pos, src: 'template' });
    fromTemplate++;
  }

  bank[word.id] = list;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(bank));

console.log(`sentences: ${Object.keys(bank).length} words covered (real ${fromReal}, template ${fromTemplate})`);
console.log(`uncovered words: ${uncovered.length}`);
if (uncovered.length) console.log(uncovered.slice(0, 20).join(', '));
console.log(`output: ${path.relative(root, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
