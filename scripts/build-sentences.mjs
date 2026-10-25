import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WORDS = path.join(root, 'public', 'data', 'words.json');
const ECDICT = path.join(__dirname, '.cache', 'ecdict.csv');
const PAIRS = path.join(__dirname, '.cache', 'tatoeba', 'sentences.json');
const PAIRS_URL =
  'https://ghfast.top/https://raw.githubusercontent.com/leonsilicon/tatoeba-sentence-pairs-in-mandarin-chinese-english/main/sentences.json';
const OUT = path.join(root, 'public', 'data', 'sentences.json');

const CONTENT_POS = new Set(['n.', 'v.', 'adj.', 'adv.']);
const STOP_WORDS = new Set([
  'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'done',
  'will', 'would', 'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'ought',
  'not', 'never', 'no', 'yes', 'too', 'also', 'very', 'quite', 'rather', 'just',
  'only', 'even', 'still', 'already', 'always', 'often', 'sometimes', 'usually',
  'here', 'there', 'now', 'then', 'again', 'once', 'twice', 'ever', 'else',
  'perhaps', 'maybe', 'well', 'so', 'as', 'such', 'more', 'most', 'less', 'least',
  'much', 'many', 'few', 'little', 'some', 'any', 'all', 'both', 'each', 'every',
  'either', 'neither', 'none', 'other', 'another', 'same', 'own',
]);
const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const IGNORE_TOKENS = new Set(['t', 's', 're', 've', 'll', 'd', 'm', 'don', 'doesn', 'didn', 'isn', 'aren', 'wasn', 'weren', 'can', 'couldn', 'won', 'wouldn', 'shouldn', 'mustn', 'ain', 'let']);

const MORPH_RULES = [
  [/ies$/, 'y'],
  [/ves$/, 'f'],
  [/ses$/, 's'],
  [/xes$/, 'x'],
  [/zes$/, 'z'],
  [/ches$/, 'ch'],
  [/shes$/, 'sh'],
  [/s$/, ''],
  [/ing$/, ''],
  [/ing$/, 'e'],
  [/ed$/, ''],
  [/ed$/, 'e'],
  [/ly$/, ''],
  [/er$/, ''],
  [/est$/, ''],
];

const IRREGULAR = {
  was: 'be', were: 'be', been: 'be', is: 'be', am: 'be', are: 'be',
  went: 'go', gone: 'go', did: 'do', done: 'do', had: 'have', has: 'have',
  said: 'say', made: 'make', took: 'take', taken: 'take', came: 'come',
  saw: 'see', seen: 'see', got: 'get', gotten: 'get', gave: 'give', given: 'give',
  found: 'find', thought: 'think', told: 'tell', became: 'become', left: 'leave',
  felt: 'feel', brought: 'bring', began: 'begin', begun: 'begin', kept: 'keep',
  held: 'hold', wrote: 'write', written: 'write', stood: 'stand', heard: 'hear',
  meant: 'mean', met: 'meet', ran: 'run', paid: 'pay', sat: 'sit',
  spoke: 'speak', spoken: 'speak', led: 'lead', grew: 'grow', grown: 'grow',
  lost: 'lose', fell: 'fall', fallen: 'fall', sent: 'send', built: 'build',
  understood: 'understand', drew: 'draw', drawn: 'draw', broke: 'break',
  broken: 'break', spent: 'spend', rose: 'rise', risen: 'rise', drove: 'drive',
  driven: 'drive', bought: 'buy', wore: 'wear', worn: 'wear', chose: 'choose',
  chosen: 'choose', ate: 'eat', eaten: 'eat', threw: 'throw', thrown: 'throw',
  caught: 'catch', taught: 'teach', flew: 'fly', flown: 'fly', forgot: 'forget',
  forgotten: 'forget', slept: 'sleep', swam: 'swim', drank: 'drink', drunk: 'drink',
  sang: 'sing', sung: 'sing', sold: 'sell', fought: 'fight', won: 'win',
  shot: 'shoot',
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function ensurePairs() {
  if (fs.existsSync(PAIRS) && fs.statSync(PAIRS).size > 1_000_000) return;
  fs.mkdirSync(path.dirname(PAIRS), { recursive: true });
  console.log('Downloading Tatoeba en-zh sentence pairs ...');
  const res = await fetch(PAIRS_URL);
  if (!res.ok) throw new Error(`Tatoeba pairs download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(PAIRS, buf);
  console.log(`Saved ${(buf.length / 1048576).toFixed(1)} MB`);
}

function loadFrq() {
  const rows = parseCSV(fs.readFileSync(ECDICT, 'utf8'));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const map = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const word = (row[idx.word] || '').trim().toLowerCase();
    if (!word || map.has(word)) continue;
    map.set(word, Number(row[idx.frq] || 0));
  }
  return map;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  await ensurePairs();
  const frq = loadFrq();
  const { words } = JSON.parse(fs.readFileSync(WORDS, 'utf8'));
  const pairs = JSON.parse(fs.readFileSync(PAIRS, 'utf8'));

  const lemmaOf = (token) => {
    const t = token.toLowerCase().replace(/['’]/g, '');
    if (frq.has(t)) return t;
    if (IRREGULAR[t]) return IRREGULAR[t];
    for (const [re, rep] of MORPH_RULES) {
      if (re.test(t)) {
        const base = t.replace(re, rep);
        if (frq.has(base)) return base;
      }
    }
    return t;
  };

  const heads = new Map();
  for (const word of words) {
    if (!word.core) continue;
    const posSet = new Set(word.senses.map((s) => s.pos).filter((p) => p !== '—'));
    if (posSet.size !== 1) continue;
    const pos = [...posSet][0];
    if (!CONTENT_POS.has(pos)) continue;
    if (word.w.includes('/') || word.w.includes(' ')) continue;
    const head = word.w.toLowerCase();
    if (STOP_WORDS.has(head) || head.length < 3) continue;
    if (!heads.has(head)) heads.set(head, []);
    heads.get(head).push({ word, pos });
  }

  const best = new Map();
  let usablePairs = 0;

  for (const [, rawZh, , en] of pairs) {
    if (typeof en !== 'string' || typeof rawZh !== 'string') continue;
    if (en.length < 18 || en.length > 110) continue;
    if (/[0-9]/.test(en) || /https?:|www\.|@/.test(en)) continue;
    if (/["“”?!]/.test(en)) continue;
    if ((en.match(/,/g) ?? []).length > 1) continue;
    if (/,\s*[A-Za-z]+[.]\s*$/.test(en)) continue;
    if (!/^[A-Z(]/.test(en.trim())) continue;
    if (/[\u4e00-\u9fff]/.test(en)) continue;
    const zh = toSimplified(rawZh);
    if (!/[\u4e00-\u9fff]/.test(zh) || zh.length < 4 || zh.length > 60) continue;

    const tokens = en.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? [];
    if (tokens.length < 7 || tokens.length > 16) continue;

    let proper = 0;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] === 'I') continue;
      if (/^[A-Z]/.test(tokens[i])) proper += 1;
    }
    if (proper > 0) continue;

    const pieces = en.match(/[A-Za-z]+/g) ?? [];
    let rare = 0;
    for (const piece of pieces) {
      const lower = piece.toLowerCase();
      if (lower.length <= 2 || IGNORE_TOKENS.has(lower)) continue;
      const lm = lemmaOf(lower);
      const rank = frq.get(lm) ?? 0;
      if (!rank || rank > 25000) rare += 1;
    }
    if (rare > 1) continue;

    const lemmaCounts = new Map();
    const tokenLemmas = tokens.map((token) => lemmaOf(token));
    for (const lm of tokenLemmas) lemmaCounts.set(lm, (lemmaCounts.get(lm) ?? 0) + 1);

    const candidates = [];
    for (const [lm, count] of lemmaCounts) {
      if (count !== 1) continue;
      const entries = heads.get(lm);
      if (!entries) continue;
      const surface = tokens[tokenLemmas.indexOf(lm)];
      if (surface.length <= 2) continue;
      for (const entry of entries) candidates.push({ ...entry, lm, surface });
    }
    if (!candidates.length) continue;
    usablePairs += 1;

    for (const candidate of candidates) {
      const re = new RegExp(`\\b${escapeRegExp(candidate.surface)}\\b`);
      if (!re.test(en)) continue;
      const text = en.replace(re, '____');
      if (!text.includes('____')) continue;

      let score = -Math.abs(tokens.length - 10);
      if (/[;:]/.test(en)) score -= 2;
      if (en.includes(',')) score -= 1;
      if (tokens[0].toLowerCase() === candidate.lm) score -= 1;
      if (zh.length > 40) score -= 1;
      score -= rare * 2;

      const list = best.get(candidate.word.id) ?? [];
      if (list.some((item) => item.text === text)) continue;
      list.push({ text, zh, pos: candidate.pos, surface: candidate.surface, src: 'tatoeba', score });
      list.sort((a, b) => b.score - a.score);
      best.set(candidate.word.id, list.slice(0, 2));
    }
  }

  const bank = {};
  const posCount = {};
  for (const [id, list] of best) {
    const cleaned = list.map(({ score, ...rest }) => {
      void score;
      return rest;
    });
    if (!cleaned.length) continue;
    bank[id] = cleaned;
    for (const item of cleaned) posCount[item.pos] = (posCount[item.pos] ?? 0) + 1;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(bank));

  const covered = Object.keys(bank).length;
  console.log(`pairs total: ${pairs.length}, usable: ${usablePairs}`);
  console.log(`sentences: ${covered} core words covered (${Object.values(bank).reduce((n, l) => n + l.length, 0)} sentences)`);
  console.log('by POS:', posCount);
  console.log(`output: ${path.relative(root, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
  if (covered < 50) throw new Error(`not enough core words with sentences: ${covered}`);
  const sample = Object.entries(bank).slice(0, 6);
  for (const [id, list] of sample) {
    const word = words.find((w) => w.id === id);
    console.log(`- ${word?.w} [${list[0].pos}] ${list[0].text}  ${list[0].zh}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
