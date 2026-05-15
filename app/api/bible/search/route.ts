import { NextRequest, NextResponse } from 'next/server';

const BIBLE_IDS: Record<string, string> = {
  nkjv: 'de4e12af7f28f599-02',
  nlt: '65eec8e0b60e656b-01',
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('reference') ?? searchParams.get('query');
  const translation = (searchParams.get('translation') ?? 'nkjv').toLowerCase();

  if (!query) {
    return NextResponse.json({ error: 'Missing required param: reference' }, { status: 400 });
  }

  const bibleId = BIBLE_IDS[translation] ?? BIBLE_IDS.nkjv;
  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'BIBLE_API_KEY is not configured' }, { status: 500 });
  }

  const url = new URL(`https://api.scripture.api.bible/v1/bibles/${bibleId}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', '10');

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

  const verses = (data?.data?.verses ?? []).map((v: { reference: string; text: string }) => ({
    reference: v.reference,
    text: stripHtml(v.text),
    translation: translation.toUpperCase(),
  }));

  const passages = (data?.data?.passages ?? []).map((p: { reference: string; content: string }) => ({
    reference: p.reference,
    text: stripHtml(p.content),
    translation: translation.toUpperCase(),
  }));

  return NextResponse.json({ results: [...verses, ...passages] });
}
