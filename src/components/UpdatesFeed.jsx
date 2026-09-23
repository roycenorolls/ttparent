'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const CAPTION_CLAMP = {
  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};

const CARD = {
  background: '#fff', borderRadius: 32, overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(60,50,30,.05), 0 8px 24px -8px rgba(60,50,30,.10)',
};

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function clock(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// "Toddler" style label; sits on the photo, or above the title when there is none.
function Pill({ children, overlay }) {
  return (
    <span style={{
      display: 'inline-block', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, color: '#fff',
      background: overlay ? 'rgba(90,86,78,.82)' : '#7A7466',
      ...(overlay ? { position: 'absolute', top: 16, left: 16 } : { marginBottom: 12 }),
    }}>
      {children}
    </span>
  );
}

// A class-wide notice with no photo reads as a reminder, not a post.
export const isReminder = u => u.type === 'announcement' && !(u.image || u.thumbnail);

// Reminders newer than this are pinned under the child's status on Home.
const PINNED_DAYS = 7;
export const isPinnedReminder = u =>
  isReminder(u) && Date.now() - new Date(u.created_at).getTime() < PINNED_DAYS * 86400000;

export function ReminderList({ updates }) {
  if (!updates?.length) return null;
  return (
    <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {updates.map(u => <ReminderCard key={u.id} u={u} />)}
    </div>
  );
}

function ReminderCard({ u }) {
  return (
    <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        ...CARD, padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start',
        background: 'linear-gradient(135deg, rgba(254,242,242,.8), #fff 55%)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 16, flexShrink: 0, background: '#EF4444', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Important reminder
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{shortDate(u.created_at)}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{u.title}</div>
          {u.body && (
            <div style={{ fontSize: 14, color: '#6B6355', lineHeight: 1.55, marginTop: 4, ...CAPTION_CLAMP }}>{u.body}</div>
          )}
        </div>
      </article>
    </Link>
  );
}

/**
 * One class post. `showDate` prefixes the time with the day, for posts that
 * aren't from today.
 */
export function PostCard({ u, showDate }) {
  const photo = u.image || u.thumbnail;
  if (isReminder(u)) return <ReminderCard u={u} />;

  return (
    <article style={CARD}>
      <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {photo && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', background: '#F1ECE1' }}>
            <img
              src={photo}
              alt={u.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {u.class_name && <Pill overlay>{u.class_name}</Pill>}
            {u.type === 'video' && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 45, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.4)',
              }}>▶</div>
            )}
          </div>
        )}

        <div style={{ padding: '22px 24px 0' }}>
          {!photo && u.class_name && <Pill>{u.class_name}</Pill>}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8C8476', marginBottom: 4 }}>{u.teacher_name || 'TutorTime'}</div>
          <h3 style={{
            margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 800,
            letterSpacing: '-0.01em', color: '#1A1712', lineHeight: 1.25,
          }}>
            {u.title}
          </h3>
          {u.body && (
            <p style={{ margin: '8px 0 0', fontSize: 15, color: '#7A7466', lineHeight: 1.6, ...CAPTION_CLAMP }}>{u.body}</p>
          )}
        </div>
      </Link>

      <Engagement u={u} time={`${showDate ? `${shortDate(u.created_at)} · ` : ''}${clock(u.created_at)}`} />
    </article>
  );
}

const REACTIONS = { heart: '❤️', thumbs: '👍', pray: '🙏' };

// Light for the feed cards, dark for the fullscreen photo viewer.
const THEMES = {
  light: {
    pill: '#F3EEE3', pillInk: '#5C5549', likedBg: '#FDE8EC', likedInk: '#BE123C',
    time: '#8C8476', rule: '#F1ECE1', note: '#8C8476',
    bubble: '#F8F4EC', bubbleInk: '#3D382E', meta: '#8C8476',
    input: { border: '1px solid #EAE3D2', background: '#fff', color: 'inherit' },
    send: { background: '#0A3A82', color: '#fff' },
    bar: '16px 24px 22px', panel: '16px 24px 22px',
    reply: '#E8F0FB', replyName: '#0A3A82', chip: '#fff',
  },
  dark: {
    pill: 'rgba(255,255,255,0.15)', pillInk: '#FDF6EE', likedBg: 'rgba(244,63,94,0.28)', likedInk: '#FDA4AF',
    time: 'rgba(253,246,238,0.6)', rule: 'rgba(255,255,255,0.12)', note: 'rgba(253,246,238,0.6)',
    bubble: 'rgba(255,255,255,0.10)', bubbleInk: '#FDF6EE', meta: 'rgba(253,246,238,0.55)',
    input: { border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' },
    send: { background: '#FDF6EE', color: '#0A3A82' },
    bar: '4px 16px 12px', panel: '12px 16px 16px',
    reply: 'rgba(147,197,253,0.18)', replyName: '#BFDBFE', chip: 'rgba(255,255,255,0.14)',
  },
};

const pill = (T, on) => ({
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999,
  background: on ? T.likedBg : T.pill, color: on ? T.likedInk : T.pillInk,
  fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
});

// Like, comment and (optionally) time. Likes show a total; comments are private
// to the teachers, so the thread below only ever lists the parent's own.
export function Engagement({ u, time, dark }) {
  const T = dark ? THEMES.dark : THEMES.light;
  const [liked, setLiked] = useState(!!u.liked);
  const [likes, setLikes] = useState(u.like_count || 0);
  const [mine,  setMine]  = useState(u.comment_count || 0);
  const [open,  setOpen]  = useState(false);
  const [opened, setOpened] = useState(false);
  const hasReply = (u.reply_count || 0) > 0 && !opened;

  const toggleLike = () => {
    const was = liked, prev = likes;
    setLiked(!was); setLikes(prev + (was ? -1 : 1));           // optimistic
    api.toggleLike(u.id)
      .then(r => { setLiked(r.liked); setLikes(r.like_count); })
      .catch(() => { setLiked(was); setLikes(prev); });
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: T.bar }}>
        <button onClick={toggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} style={pill(T, liked)}>
          <HeartIcon filled={liked} />{likes}
        </button>
        <button onClick={() => { setOpen(o => !o); setOpened(true); }} aria-expanded={open} style={pill(T, false)}>
          <CommentIcon />{mine > 0 ? `Comment · ${mine}` : 'Comment'}
          {hasReply && <span aria-label="Teacher replied" style={{ width: 8, height: 8, borderRadius: 999, background: '#E11D48' }} />}
        </button>
        {time && <span style={{ marginLeft: 'auto', fontSize: 14, color: T.time, fontWeight: 500, flexShrink: 0 }}>{time}</span>}
      </div>
      {open && <CommentPanel T={T} updateId={u.id} onAdded={() => setMine(n => n + 1)} />}
    </>
  );
}

function CommentPanel({ T, updateId, onAdded }) {
  const [items,   setItems]   = useState(null);
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchComments = () => api.comments(updateId).then(d => setItems(d.comments || [])).catch(() => {});
    fetchComments();

    const interval = setInterval(fetchComments, 8000);
    const onFocus = () => fetchComments();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [updateId]);

  const send = e => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    api.addComment(updateId, body)
      .then(d => { setItems(list => [...(list || []), d.comment]); setText(''); onAdded(); })
      .catch(() => setError("Couldn't send. Please try again."))
      .finally(() => setSending(false));
  };

  return (
    <div style={{ padding: T.panel, borderTop: `1px solid ${T.rule}` }}>
      <div style={{ fontSize: 12, color: T.note, marginBottom: 10 }}>
        🔒 Only the teachers can read your comments.
      </div>
      {(items || []).map(c => c.author === 'teacher' ? (
        <div key={c.id} style={{ background: T.reply, borderRadius: 18, padding: '10px 14px', marginBottom: 8, marginLeft: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.replyName, marginBottom: 2 }}>{c.teacher_name}</div>
          <div style={{ fontSize: 14, color: T.bubbleInk, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
          <div style={{ fontSize: 11, color: T.meta, marginTop: 4 }}>{shortDate(c.created_at)} · {clock(c.created_at)}</div>
        </div>
      ) : (
        <div key={c.id} style={{ background: T.bubble, borderRadius: 18, padding: '10px 14px', marginBottom: 8 }}>
          <div style={{ fontSize: 14, color: T.bubbleInk, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
          <div style={{ fontSize: 11, color: T.meta, marginTop: 4 }}>{shortDate(c.created_at)} · {clock(c.created_at)}</div>
          {REACTIONS[c.reaction] && (
            <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, background: T.chip, color: T.bubbleInk, borderRadius: 999, padding: '2px 10px' }}>
              {REACTIONS[c.reaction]} from your teacher
            </span>
          )}
        </div>
      ))}
      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input
          value={text} onChange={e => setText(e.target.value)} maxLength={500}
          placeholder="Write a comment…" aria-label="Write a comment"
          style={{
            flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 999, fontSize: 14, fontFamily: 'inherit',
            outline: 'none', ...T.input,
          }}
        />
        <button type="submit" disabled={!text.trim() || sending} style={{
          padding: '10px 16px', borderRadius: 999, border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer', opacity: !text.trim() || sending ? 0.45 : 1, ...T.send,
        }}>
          Send
        </button>
      </form>
      {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1.2-4.4A8 8 0 1121 12z" />
    </svg>
  );
}

export default function UpdatesFeed({ updates, title = 'Latest updates' }) {
  if (!updates?.length) return null;

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 12px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: '#0F172A' }}>
          {title}
        </h2>
        <Link href="/gallery" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 700, color: 'var(--tt-cobalt)', textDecoration: 'none',
        }}>
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {updates.map(u => <PostCard key={u.id} u={u} showDate />)}
      </div>
    </div>
  );
}
