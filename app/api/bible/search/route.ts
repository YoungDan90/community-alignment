import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('reference') ?? searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing required param: reference' }, { status: 400 });
  }

  const encoded = encodeURIComponent(query);
  const url = `https://bible-api.com/${encoded}?translation=kjv`;

  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: `bible-api.com error ${res.status}` },
      { status: res.status },
    );
  }

  const data = await res.json();

  // bible-api.com returns either a single passage or an array of verses
  const verses = Array.isArray(data.verses)
    ? data.verses.map((v: { book_name: string; chapter: number; verse: number; text: string }) => ({
        reference: `${v.book_name} ${v.chapter}:${v.verse}`,
        text: v.text.trim(),
        translation: 'KJV',
      }))
    : [{ reference: data.reference ?? query, text: (data.text ?? '').trim(), translation: 'KJV' }];

  return NextResponse.json({ results: verses });
}
