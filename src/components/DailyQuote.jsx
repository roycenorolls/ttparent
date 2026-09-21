'use client';
import { useEffect, useState } from 'react';

export default function DailyQuote() {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = localStorage.getItem('tt_quote');
    if (cached) {
      try {
        const { date, data } = JSON.parse(cached);
        if (date === today && data?.quote) { setQuote(data); return; }
      } catch {}
    }
    fetch('/api/quote')
      .then(r => r.json())
      .then(data => {
        // Only keep a quote that actually has text — otherwise the card would
        // render bare quote marks, and localStorage would pin that for the day.
        if (!data?.quote) return;
        setQuote(data);
        localStorage.setItem('tt_quote', JSON.stringify({ date: today, data }));
      })
      .catch(() => {});
  }, []);

  if (!quote?.quote) return null;

  return (
    <div style={{
      margin: '0 16px',
      background: 'var(--tt-yellow-tint)',
      borderLeft: '3px solid var(--tt-yellow)',
      borderRadius: '0 12px 12px 0',
      padding: '12px 14px',
    }}>
      <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--tt-yellow-text)', margin: 0, lineHeight: 1.5 }}>
        &ldquo;{quote.quote}&rdquo;
      </p>
      {quote.author && (
        <p style={{ fontSize: 12, color: 'var(--tt-yellow-text)', margin: '6px 0 0', fontWeight: 500 }}>
          — {quote.author}
        </p>
      )}
    </div>
  );
}
