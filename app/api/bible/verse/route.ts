import { NextRequest, NextResponse } from 'next/server';

const BIBLE_IDS: Record<string, string> = {
  nkjv: 'de4e12af7f28f599-02',
  nlt: '65eec8e0b60e656b-01',
};

// Maps human reference (e.g. "Psalm 1:2") to API.Bible passage ID format (PSA.1.2)
const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU',
  joshua: 'JOS', judges: 'JDG', ruth: 'RUT',
  '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
  '1 chronicles': '1CH', '2 chronicles': '2CH',
  ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB',
  psalm: 'PSA', psalms: 'PSA', proverbs: 'PRO', ecclesiastes: 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG',
  isaiah: 'ISA', jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK',
  daniel: 'DAN', hosea: 'HOS', joel: 'JOL', amos: 'AMO', obadiah: 'OBA',
  jonah: 'JON', micah: 'MIC', nahum: 'NAM', habakkuk: 'HAB',
  zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL',
  matthew: 'MAT', mark: 'MRK', luke: 'LUK', john: 'JHN', acts: 'ACT',
  romans: 'ROM',
  '1 corinthians': '1CO', '2 corinthians': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL',
  '1 thessalonians': '1TH', '2 thessalonians': '2TH',
  '1 timothy': '1TI', '2 timothy': '2TI',
  titus: 'TIT', philemon: 'PHM', hebrews: 'HEB', james: 'JAS',
  '1 peter': '1PE', '2 peter': '2PE',
  '1 john': '1JN', '2 john': '2JN', '3 john': '3JN',
  jude: 'JUD', revelation: 'REV',
  // common abbreviations
  ps: 'PSA', psa: 'PSA', prov: 'PRO', rev: 'REV', eph: 'EPH',
  phil: 'PHP', col: 'COL', heb: 'HEB', jas: 'JAS', gen: 'GEN',
  jn: 'JHN', mt: 'MAT', mk: 'MRK', lk: 'LUK', rom: 'ROM',
};

function referenceToPassageId(reference: string): string | null {
  // e.g. "Psalm 1:2-3"  →  "PSA.1.2-PSA.1.3"
  // e.g. "John 3:16"    →  "JHN.3.16"
  const clean = reference.trim();
  const match = clean.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
  if (!match) return null;

  const [, bookRaw, chapter, verseStart, verseEnd] = match;
  const bookKey = bookRaw.toLowerCase();
  const code = BOOK_CODES[bookKey];
  if (!code) return null;

  if (!verseStart) return `${code}.${chapter}`;
  if (!verseEnd) return `${code}.${chapter}.${verseStart}`;
  return `${code}.${chapter}.${verseStart}-${code}.${chapter}.${verseEnd}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const translation = (searchParams.get('translation') ?? 'nkjv').toLowerCase();

  if (!reference) {
    return NextResponse.json({ error: 'Missing required param: reference' }, { status: 400 });
  }

  const bibleId = BIBLE_IDS[translation] ?? BIBLE_IDS.nkjv;
  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'BIBLE_API_KEY is not configured' }, { status: 500 });
  }

  const passageId = referenceToPassageId(reference);
  if (!passageId) {
    return NextResponse.json({ error: `Could not parse reference: "${reference}"` }, { status: 400 });
  }

  const url = new URL(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${passageId}`,
  );
  url.searchParams.set('content-type', 'text');
  url.searchParams.set('include-notes', 'false');
  url.searchParams.set('include-titles', 'false');
  url.searchParams.set('include-chapter-numbers', 'false');
  url.searchParams.set('include-verse-numbers', 'false');

  const res = await fetch(url.toString(), {
    headers: { 'api-key': apiKey },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: `API.Bible error ${res.status}`, detail: body },
      { status: res.status },
    );
  }

  const data = await res.json();
  const passage = data?.data;

  return NextResponse.json({
    verse: {
      reference: passage?.reference ?? reference,
      text: stripHtml(passage?.content ?? ''),
      translation: translation.toUpperCase(),
    },
  });
}
