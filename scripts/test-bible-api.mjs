/**
 * Run with: node scripts/test-bible-api.mjs
 * Tests both /search and /verse routes by hitting API.Bible directly
 * (same logic the Next.js API routes use, so this validates key + mapping).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const BIBLE_IDS = {
  nkjv: 'de4e12af7f28f599-02',
  nlt:  '65eec8e0b60e656b-01',
};

const API_KEY = env.BIBLE_API_KEY;
const REFERENCE = 'Psalm 1:2';
const PASSAGE_ID = 'PSA.1.2';

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function testSearch(translation) {
  const bibleId = BIBLE_IDS[translation];
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/search?query=${encodeURIComponent(REFERENCE)}&limit=3`;
  console.log(`\n── SEARCH [${translation.toUpperCase()}] ─────────────────`);
  const res = await fetch(url, { headers: { 'api-key': API_KEY } });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${res.status}:`, data);
    return;
  }
  const verses = data?.data?.verses ?? [];
  if (verses.length === 0) {
    console.log('  No verse results. Passages:', data?.data?.passages?.length ?? 0);
  }
  verses.slice(0, 2).forEach((v) => {
    console.log(`  ✓ ${v.reference}: "${stripHtml(v.text).slice(0, 100)}..."`);
  });
}

async function testVerse(translation) {
  const bibleId = BIBLE_IDS[translation];
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${PASSAGE_ID}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
  console.log(`\n── VERSE [${translation.toUpperCase()}] ──────────────────`);
  const res = await fetch(url, { headers: { 'api-key': API_KEY } });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${res.status}:`, data);
    return;
  }
  const passage = data?.data;
  console.log(`  ✓ ${passage?.reference}: "${stripHtml(passage?.content ?? '').slice(0, 120)}..."`);
}

console.log('Testing API.Bible integration');
console.log('API key:', API_KEY ? `${API_KEY.slice(0, 6)}…` : 'MISSING');
console.log('Reference:', REFERENCE, '→ Passage ID:', PASSAGE_ID);

await testSearch('nkjv');
await testSearch('nlt');
await testVerse('nkjv');
await testVerse('nlt');

console.log('\nDone.');
