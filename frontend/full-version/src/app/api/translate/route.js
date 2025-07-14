import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text, target_lang } = await request.json();

    if (!text || !target_lang) {
      return NextResponse.json({ error: 'Missing text or target_lang' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_DEEPL_AUTH_KEY) {
      return NextResponse.json({ error: 'DeepL API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.NEXT_PUBLIC_DEEPL_AUTH_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: text,
        target_lang: target_lang.toUpperCase()
      }).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error:', errorText);
      return NextResponse.json({ error: 'Translation failed' }, { status: response.status });
    }

    const data = await response.json();
    const translation = data.translations?.[0]?.text || '';

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
