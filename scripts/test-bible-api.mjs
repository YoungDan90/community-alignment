/**
 * Run with: node scripts/test-bible-api.mjs
 * Tests the bible-api.com integration (no API key required).
 */

const BASE = 'https://bible-api.com';
const REFERENCES = ['Psalm 1:2', 'John 15:5'];

async function testVerse(reference) {
  const url = `${BASE}/${encodeURIComponent(reference)}?translation=kjv`;
  console.log(`\n── VERSE: ${reference}`);
  console.log(`   ${url}`);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${res.status}:`, data);
    return;
  }
  console.log(`  ✓ Reference : ${data.reference}`);
  console.log(`  ✓ Text      : "${data.text.trim().slice(0, 120)}..."`);
}

async function testSearch(reference) {
  const url = `${BASE}/${encodeURIComponent(reference)}?translation=kjv`;
  console.log(`\n── SEARCH: ${reference}`);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${res.status}:`, data);
    return;
  }
  const verses = Array.isArray(data.verses) ? data.verses : [data];
  verses.slice(0, 2).forEach((v) => {
    const ref = v.reference ?? `${v.book_name} ${v.chapter}:${v.verse}`;
    const text = (v.text ?? '').trim().slice(0, 100);
    console.log(`  ✓ ${ref}: "${text}..."`);
  });
}

console.log('Testing bible-api.com integration (no API key required)\n');

for (const ref of REFERENCES) {
  await testVerse(ref);
  await testSearch(ref);
}

console.log('\nDone.');
