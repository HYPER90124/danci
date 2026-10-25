import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE = path.join(CACHE_DIR, 'ecdict.csv');
const ECDICT_URL =
  process.env.ECDICT_URL ||
  'https://ghfast.top/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv';

const WORDS_TXT = path.join(root, 'data', 'cet_4_words.txt');
const OVERRIDES = path.join(root, 'data', 'overrides.json');
const SUPPLEMENT = path.join(root, 'data', 'supplement.json');
const OUT_DIR = path.join(root, 'public', 'data');
const OUT = path.join(OUT_DIR, 'words.json');
const MISSING = path.join(root, 'data', 'missing.json');

const POS_SET = new Set(['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'num.', 'art.', 'int.', 'aux.']);
const POS_MAP = {
  n: 'n.', pl: 'n.', u: 'n.', c: 'n.',
  v: 'v.', vt: 'v.', vi: 'v.', aux: 'aux.', modal: 'aux.',
  a: 'adj.', adj: 'adj.',
  ad: 'adv.', adv: 'adv.',
  prep: 'prep.', conj: 'conj.', pron: 'pron.', num: 'num.',
  art: 'art.', int: 'int.', interj: 'int.',
};

const ENTRY_FIXES = {
  accordingto: 'according to',
  oughtto: 'ought to',
  owingto: 'owing to',
  fiarly: 'fairly',
  summrise: 'summarize',
  instalation: 'installation',
  celcius: 'celsius',
  despatch: 'dispatch',
  dependencedependable: 'dependence/dependable',
  reformationreformist: 'reformation/reformist',
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
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function ensureEcdict() {
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 1_000_000) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Downloading ECDICT (~66MB) ...');
  const res = await fetch(ECDICT_URL);
  if (!res.ok) throw new Error(`ECDICT download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(CACHE, buf);
  console.log(`Saved ${(buf.length / 1048576).toFixed(1)} MB`);
}

function loadDictionary() {
  const rows = parseCSV(fs.readFileSync(CACHE, 'utf8'));
  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const map = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 4) continue;
    const word = (row[idx.word] || '').trim().toLowerCase();
    if (!word) continue;
    if (!map.has(word)) {
      map.set(word, {
        word,
        phonetic: (row[idx.phonetic] || '').trim(),
        translation: (row[idx.translation] || '').trim(),
        definition: (row[idx.definition] || '').trim(),
        pos: (row[idx.pos] || '').trim(),
        collins: Number(row[idx.collins] || 0),
        oxford: Number(row[idx.oxford] || 0),
        tag: (row[idx.tag] || '').trim(),
        frq: Number(row[idx.frq] || 0),
      });
    }
  }
  return map;
}

function cleanMeaning(raw) {
  let s = raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/^[;；,，\s]+/, '')
    .replace(/[;；,，\s]+$/, '')
    .replace(/[（(][^）)]{0,12}[）)]/g, '')
    .replace(/【[^】]{0,8}】/g, '')
    .replace(/〈[^〉]{0,8}〉/g, '')
    .replace(/[，,]\s+/g, '，')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return s;
}

function splitMeanings(text) {
  return text
    .split(/[;；]/)
    .map((part) => cleanMeaning(part.split(/[，,]/).slice(0, 2).join('，')))
    .filter(Boolean);
}

function inferPos(entry, display) {
  if (entry.pos) {
    const first = entry.pos.split(/[^a-zA-Z]+/)[0];
    const mapped = POS_MAP[(first || '').toLowerCase()];
    if (mapped) return mapped;
  }
  const m = (entry.definition || '').match(/^([nvasr])(?:\.|\s)/);
  if (m) return { n: 'n.', v: 'v.', a: 'adj.', s: 'adj.', r: 'adv.' }[m[1]] || '';
  if (/\s/.test(display)) return 'phr.';
  return '';
}

function parseEntry(entry, display) {
  const normalized = entry.translation.replace(/\\r/g, '').replace(/\\n/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const senses = [];
  const seen = new Set();
  const untagged = [];

  const push = (pos, cn) => {
    if (!cn) return;
    if (/人名|地名|姓氏|商标|缩写|音标|变体|复数形式|过去式|过去分词/.test(cn)) return;
    if (/累加器|加法器|寄存器|汇编语言|算法语言|编译程序|命令语言|计算机语言|控制线|软件测试环境|半径，比例，读/.test(cn)) return;
    if (cn.length > 30) return;
    const key = `${pos}|${cn}`;
    if (seen.has(key)) return;
    if (senses.some((s) => s.pos === pos && (s.cn.includes(cn) || cn.includes(s.cn)))) return;
    seen.add(key);
    senses.push({ pos, cn });
  };

  for (const line of lines) {
    let pos = '';
    let rest = line;
    const m = line.match(/^([a-zA-Z]{1,6})\.\s*(.*)$/);
    if (m && POS_MAP[m[1].toLowerCase()]) {
      pos = POS_MAP[m[1].toLowerCase()];
      rest = m[2];
    }
    if (!pos) {
      const whole = cleanMeaning(rest);
      if (whole) untagged.push(whole);
      continue;
    }
    const parts = splitMeanings(rest);
    for (const cn of parts) push(pos, cn);
    if (senses.length >= 4) break;
  }

  if (!senses.length && untagged.length) {
    const pos = inferPos(entry, display) || '—';
    for (const cn of untagged) push(pos, cn);
  }

  return senses.slice(0, 4);
}

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

function lookupCandidates(display) {
  const out = new Set();
  const push = (s) => { const v = s.trim().toLowerCase(); if (v) out.add(v); };
  push(display);
  const fixed = ENTRY_FIXES[display.trim().toLowerCase()];
  if (fixed) push(fixed);
  for (const part of display.split('/')) push(part);
  for (const part of display.split('/')) push(part.replace(/-/g, ' '));
  for (const part of display.split('/')) {
    const base = part.trim().toLowerCase();
    for (const [re, rep] of MORPH_RULES) {
      if (re.test(base)) push(base.replace(re, rep));
    }
  }
  return [...out];
}

function findEntries(dict, display) {
  const hits = [];
  const seen = new Set();
  for (const key of lookupCandidates(display)) {
    const hit = dict.get(key);
    if (hit && hit.translation && !seen.has(hit.word)) {
      seen.add(hit.word);
      hits.push(hit);
    }
  }
  return hits;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function main() {
  await ensureEcdict();
  const dict = loadDictionary();
  const overrides = readJson(OVERRIDES, {});
  const supplement = readJson(SUPPLEMENT, {});

  const rawLines = fs.readFileSync(WORDS_TXT, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const seen = new Set();
  const usedIds = new Set();
  const words = [];
  const missing = [];
  const duplicates = [];

  for (const line of rawLines) {
    let display = line.trim().replace(/\s+/g, ' ');
    if (!display) continue;
    const fixedDisplay = ENTRY_FIXES[display.toLowerCase()];
    if (fixedDisplay) display = fixedDisplay;
    const key = display.toLowerCase();
    if (seen.has(key)) { duplicates.push(display); continue; }
    seen.add(key);

    let senses = [];
    let src = 'ecdict';
    let phon = '';
    const ov = overrides[display] || overrides[key];
    if (Array.isArray(ov) && ov.length) {
      senses = ov;
      src = 'override';
    } else {
      const entries = findEntries(dict, display);
      if (entries.length) {
        const merged = [];
        const seenSense = new Set();
        for (const entry of entries) {
          for (const sense of parseEntry(entry, display)) {
            const senseKey = `${sense.pos}|${sense.cn}`;
            if (seenSense.has(senseKey)) continue;
            if (merged.some((s) => s.pos === sense.pos && (s.cn.includes(sense.cn) || sense.cn.includes(s.cn)))) continue;
            seenSense.add(senseKey);
            merged.push(sense);
          }
        }
        senses = merged.slice(0, 4);
        phon = entries.find((entry) => entry.phonetic)?.phonetic || '';
        if (!senses.length) {
          const sup = supplement[display] || supplement[key];
          if (Array.isArray(sup) && sup.length) { senses = sup; src = 'supplement'; }
        }
      } else {
        const sup = supplement[display] || supplement[key];
        if (Array.isArray(sup) && sup.length) { senses = sup; src = 'supplement'; }
      }
    }

    if (!senses.length) { missing.push(display); continue; }

    const idBase = display.split('/')[0] || display;
    const baseId = idBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `w-${words.length + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    words.push({
      id,
      w: display,
      ...(phon ? { phon } : {}),
      rank: words.length + 1,
      senses,
      src,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ version: 1, words }));
  fs.writeFileSync(MISSING, JSON.stringify(missing, null, 2));

  const fromOverride = words.filter((w) => w.src === 'override').length;
  const noPos = words.filter((w) => w.senses.every((s) => !POS_SET.has(s.pos))).length;
  console.log(`words: ${words.length} (total lines ${rawLines.filter((l) => l.trim()).length}, duplicates ${duplicates.length})`);
  console.log(`sources: ecdict ${words.length - fromOverride}, override ${fromOverride}`);
  console.log(`missing definitions: ${missing.length} -> data/missing.json`);
  console.log(`words without usable POS: ${noPos}`);
  console.log(`output: ${path.relative(root, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
  if (duplicates.length) console.log('duplicate entries skipped:', duplicates.slice(0, 10).join(', '));
}

main().catch((err) => { console.error(err); process.exit(1); });
