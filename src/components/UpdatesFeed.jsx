'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { accentAt } from '@/lib/playful';
import Sparkles from '@/components/Sparkles';

const CAPTION_CLAMP = {
  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};

const HEADING = { fontFamily: 'var(--tt-font-heading)', color: 'var(--tt-text)' };

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function clock(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// An announcement: pinned at the top of Home, attachments behind a tap.
// New announcements carry an end time; an older 'announcement' post that has
// photos was really a photo post, so it stays a normal card.
export const isReminder = u => u.type === 'announcement' && (!!u.ends_at || !u.media?.length);

// New announcements stay pinned until their end time (the API drops them after);
// older ones without an end time are pinned for 7 days.
const PINNED_DAYS = 7;
export const isPinnedReminder = u =>
  isReminder(u) && (!!u.ends_at || Date.now() - new Date(u.created_at).getTime() < PINNED_DAYS * 86400000);

export function ReminderList({ updates }) {
  if (!updates?.length) return null;
  return (
    <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {updates.map(u => <ReminderCard key={u.id} u={u} />)}
    </div>
  );
}

function ReminderCard({ u }) {
  return (
    <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article className="tt-pop-in" style={{
        position: 'relative', background: '#fff', borderRadius: 24, padding: '18px 16px 16px',
        border: '2.5px solid #FFC2CB', boxShadow: '0 5px 0 #FFE3E7',
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <span className="tt-sticker" style={{
          position: 'absolute', top: -12, right: 14, background: 'var(--tt-red-bright)', color: '#fff', boxShadow: '0 2px 0 #B0192D',
        }}>
          Important
        </span>
        <div style={{
          width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: 'var(--tt-red-bright)', color: '#fff',
          transform: 'rotate(-6deg)', boxShadow: '0 3px 0 #B0192D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tt-muted)' }}>Reminder · {shortDate(u.created_at)}</div>
          <div style={{ ...HEADING, fontSize: 18, fontWeight: 600, lineHeight: 1.25, marginTop: 2 }}>{u.title}</div>
          {u.body && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tt-muted)', lineHeight: 1.5, marginTop: 4, ...CAPTION_CLAMP }}>{u.body}</div>
          )}
          {u.media?.length > 0 && (
            <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--tt-red-bright)', marginTop: 8 }}>
              📎 {u.media.length} {u.media.length === 1 ? 'attachment' : 'attachments'} · tap to view
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

/**
 * One class post. `showDate` prefixes the time with the day, for posts that
 * aren't from today. `accent` picks the card colour (red → yellow → blue).
 */
export function PostCard({ u, showDate, accent = 0 }) {
  const photo = u.image || u.thumbnail;
  if (isReminder(u)) return <ReminderCard u={u} />;

  const a = accentAt(accent);
  const teacher = u.teacher_name || 'TutorTime';
  const files = u.media?.length || 0;

  return (
    <article className="tt-pop-in" style={{
      background: '#fff', borderRadius: 28, padding: 18,
      boxShadow: `0 6px 0 ${a.soft}, 0 14px 28px -12px rgba(27,33,64,.18)`,
    }}>
      <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13, flexShrink: 0, background: a.main, color: a.on,
            transform: 'rotate(-5deg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--tt-font-heading)', fontSize: 16, fontWeight: 700,
          }}>
            {teacher.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...HEADING, fontSize: 15, fontWeight: 600 }}>{teacher}</div>
            {u.teacher_name && <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tt-muted)' }}>Teacher</div>}
          </div>
          {u.class_name && (
            <span style={{
              marginLeft: 'auto', flexShrink: 0, padding: '5px 12px', borderRadius: 999, background: a.tint,
              ...HEADING, fontSize: 13, fontWeight: 600,
            }}>
              {u.class_name}
            </span>
          )}
        </div>

        {photo && (
          <div style={{ position: 'relative', margin: '16px -4px 0' }}>
            <span className="tt-tape" />
            <div style={{
              position: 'relative', aspectRatio: '4 / 5', borderRadius: 22, overflow: 'hidden',
              border: '5px solid #fff', boxShadow: '0 3px 12px rgba(0,0,0,.12)', transform: 'rotate(-1.2deg)', background: '#F1ECE1',
            }}>
              <img
                src={photo}
                alt={u.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {(u.cover_type ?? u.type) === 'video' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.92)', color: 'var(--tt-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 rgba(0,0,0,.18)',
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </div>
              )}
              {files > 1 && (
                <span style={{
                  position: 'absolute', right: 12, bottom: 12, padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(27,33,64,.7)', color: '#fff', fontSize: 12, fontWeight: 800,
                }}>
                  1 / {files}
                </span>
              )}
            </div>
          </div>
        )}

        <h3 style={{ ...HEADING, margin: '14px 0 4px', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
          {u.title}
        </h3>
        {u.body && (
          <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: 'var(--tt-muted)', lineHeight: 1.45, ...CAPTION_CLAMP }}>{u.body}</p>
        )}
      </Link>

      <Engagement u={u} time={`${showDate ? `${shortDate(u.created_at)} · ` : ''}${clock(u.created_at)}`} />
    </article>
  );
}

const REACTIONS = { heart: '❤️', thumbs: '👍', pray: '🙏' };

// Light for the feed cards, dark for the fullscreen photo viewer.
const THEMES = {
  light: {
    time: 'var(--tt-muted)', rule: '#F1ECE1', note: 'var(--tt-muted)',
    bubble: '#FFF6DB', bubbleInk: 'var(--tt-text)', meta: 'var(--tt-muted)',
    input: { border: '2px solid #DCE3F2', background: '#fff', color: 'inherit' },
    send: { background: 'var(--tt-blue)', color: '#fff', '--tt-edge': '#001E57' },
    bar: '16px 0 0', panel: '16px 0 0', panelTop: 16,
    reply: '#E3ECFF', replyName: 'var(--tt-blue)', chip: '#fff',
  },
  dark: {
    time: 'rgba(253,246,238,0.6)', rule: 'rgba(255,255,255,0.12)', note: 'rgba(253,246,238,0.6)',
    bubble: 'rgba(255,255,255,0.10)', bubbleInk: '#FDF6EE', meta: 'rgba(253,246,238,0.55)',
    input: { border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' },
    send: { background: 'var(--tt-yellow)', color: 'var(--tt-blue)', '--tt-edge': '#D9A800' },
    bar: '4px 16px 12px', panel: '12px 16px 16px', panelTop: 0,
    reply: 'rgba(147,197,253,0.18)', replyName: '#BFDBFE', chip: 'rgba(255,255,255,0.14)',
  },
};

// Like, comment and (optionally) time, as jelly bubbles: an icon and a number,
// filled once the parent has liked / commented. Likes show a total; comments
// are private to the teachers, so the thread below only ever lists the parent's own.
export function Engagement({ u, time, dark }) {
  const T = dark ? THEMES.dark : THEMES.light;
  const [liked, setLiked] = useState(!!u.liked);
  const [likes, setLikes] = useState(u.like_count || 0);
  const [mine,  setMine]  = useState(u.comment_count || 0);
  const [open,  setOpen]  = useState(false);
  const [opened, setOpened] = useState(false);
  // Tap counters: re-keying the bubble replays its wobble (and sparkles).
  const [likeTaps, setLikeTaps] = useState(0);
  const [commentTaps, setCommentTaps] = useState(0);
  const hasReply = (u.reply_count || 0) > 0 && !opened;

  const toggleLike = () => {
    const was = liked, prev = likes;
    setLikeTaps(n => n + 1);
    setLiked(!was); setLikes(prev + (was ? -1 : 1));           // optimistic
    api.toggleLike(u.id)
      .then(r => { setLiked(r.liked); setLikes(r.like_count); })
      .catch(() => { setLiked(was); setLikes(prev); });
  };

  const toggleComments = () => {
    setCommentTaps(n => n + 1);
    setOpen(o => !o);
    setOpened(true);
  };

  const cls = kind => `tt-react tt-react-${kind}${dark ? ' is-dark' : ''}`;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: T.bar }}>
        <button onClick={toggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'}
                className={`${cls('like')}${liked ? ' is-on' : ''}`}>
          <span key={likeTaps} className={`tt-react-bub${likeTaps ? ' tt-jelly' : ''}`}>
            <HeartIcon />
            {liked && likeTaps > 0 && <Sparkles radius={30} />}
          </span>
          <span key={likes} className={likeTaps ? 'tt-bump' : undefined}>{likes}</span>
        </button>
        <button onClick={toggleComments} aria-expanded={open}
                aria-label={mine > 0 ? `Comments, ${mine} from you` : 'Comment'}
                className={`${cls('comment')}${mine > 0 ? ' is-on' : ''}`}>
          <span key={commentTaps} className={`tt-react-bub${commentTaps ? ' tt-jelly' : ''}`}>
            <CommentIcon />
            {hasReply && <span className="tt-react-dot" aria-label="Teacher replied" />}
          </span>
          <span>{mine}</span>
        </button>
        {time && <span style={{ marginLeft: 'auto', fontSize: 13, color: T.time, fontWeight: 700, flexShrink: 0 }}>{time}</span>}
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
    <div style={{ padding: T.panel, marginTop: T.panelTop, borderTop: `2px dashed ${T.rule}` }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.note, marginBottom: 10 }}>
        🔒 Only the teachers can read your comments.
      </div>
      {(items || []).map(c => c.author === 'teacher' ? (
        <div key={c.id} style={{ background: T.reply, borderRadius: '20px 20px 20px 6px', padding: '10px 14px', marginBottom: 8, marginLeft: 28 }}>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 13, fontWeight: 600, color: T.replyName, marginBottom: 2 }}>{c.teacher_name}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.bubbleInk, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.meta, marginTop: 4 }}>{shortDate(c.created_at)} · {clock(c.created_at)}</div>
        </div>
      ) : (
        <div key={c.id} style={{ background: T.bubble, borderRadius: '20px 20px 6px 20px', padding: '10px 14px', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.bubbleInk, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.meta, marginTop: 4 }}>{shortDate(c.created_at)} · {clock(c.created_at)}</div>
          {REACTIONS[c.reaction] && (
            <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, background: T.chip, color: T.bubbleInk, borderRadius: 999, padding: '2px 10px' }}>
              {REACTIONS[c.reaction]} from your teacher
            </span>
          )}
        </div>
      ))}
      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 4, paddingBottom: 4 }}>
        <input
          value={text} onChange={e => setText(e.target.value)} maxLength={500}
          placeholder="Write a comment…" aria-label="Write a comment"
          style={{
            flex: 1, minWidth: 0, padding: '10px 16px', borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            outline: 'none', ...T.input,
          }}
        />
        <button type="submit" disabled={!text.trim() || sending} className="tt-press" style={{
          padding: '10px 18px', borderRadius: 999, border: 'none', fontSize: 15, fontWeight: 600,
          fontFamily: 'var(--tt-font-heading)', cursor: 'pointer', opacity: !text.trim() || sending ? 0.45 : 1, ...T.send,
        }}>
          Send
        </button>
      </form>
      {error && <div style={{ fontSize: 12, fontWeight: 700, color: '#F87171', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// Two-tone: the outline takes the bubble colour, the fill comes from --f.
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <path className="tt-fill" d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <path className="tt-fill" d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.5" cy="12" r="1.3" /><circle cx="12.5" cy="12" r="1.3" /><circle cx="16.5" cy="12" r="1.3" />
      </g>
    </svg>
  );
}

// The rest of the feed, straight after the day timeline. `accentStart` carries
// the card colours on from the timeline's posts.
export default function UpdatesFeed({ updates, accentStart = 0 }) {
  if (!updates?.length) return null;

  return (
    <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {updates.map((u, i) => <PostCard key={u.id} u={u} showDate accent={accentStart + i} />)}
    </div>
  );
}
