import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_DIR = os.tmpdir();

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const cacheFile = path.join(CACHE_DIR, `tt-quote-${today}.json`);

  // Serve from cache if available. Guarded because an earlier build could
  // write an empty object here, which would then be served all day.
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached?.quote) return NextResponse.json(cached);
      fs.unlinkSync(cacheFile);
    } catch {
      fs.unlinkSync(cacheFile);
    }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content:
            'Generate one short uplifting quote about childhood, parenting, or growth. ' +
            'It must feel warm and personal, not corporate or like a motivational poster. ' +
            'Maximum 2 sentences. Attribute to a real, well-known person if possible. ' +
            'No religious content. No hustle culture. ' +
            'Respond ONLY with valid JSON, no markdown: {"quote": "...", "author": "..."}',
        }],
      }),
    });

    const data   = await res.json();
    const text   = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    // Without a usable quote this would cache `{}` for the rest of the day and
    // the card would render as a pair of empty quote marks. An unset API key
    // takes exactly this path — res.json() is an error object, not a message.
    if (!parsed?.quote) throw new Error('No quote in response');

    fs.writeFileSync(cacheFile, JSON.stringify(parsed));

    return NextResponse.json(parsed);
  } catch {
    // Not cached — so a transient failure retries tomorrow rather than pinning
    // the fallback for the day.
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}

const FALLBACK = {
  quote: 'Every child is a different kind of flower, and together they make this world a beautiful garden.',
  author: '',
};
