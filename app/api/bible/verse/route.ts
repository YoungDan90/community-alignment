import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Missing required param: reference' }, { status: 400 });
  }

  const encoded = encodeURIComponent(reference);
  const url = `https://bible-api.com/${encoded}?translation=kjv`;

  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: `bible-api.com error ${res.status}` },
      { status: res.status },
    );
  }

  const data = await res.json();

  return NextResponse.json({
    verse: {
      reference: data.reference ?? reference,
      text: (data.text ?? '').trim(),
      translation: 'KJV',
    },
  });
}
