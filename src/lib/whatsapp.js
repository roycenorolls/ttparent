// Link for a WhatsApp button: a chat with `number` when there is one,
// otherwise WhatsApp's "Send to…" list so the parent picks the chat. There is
// no link that just opens WhatsApp on Android: a plain whatsapp:// is ignored
// and whatsapp://send without a number or text is rejected ("Couldn't open
// this chat link"), so the fallback carries a short greeting.
//
// Schools type numbers into the dashboard however they like (0812…, +62 812…,
// 62812…); wa.me needs 62812….
export function whatsappLink(number, text) {
  const local = String(number || '').replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
  const q = encodeURIComponent(text || 'Hello');
  return local ? `https://wa.me/62${local}${text ? `?text=${q}` : ''}` : `whatsapp://send?text=${q}`;
}

const DEFAULT_ASK = 'Hi {teacher}, I have a question about "{title}" ({date}).';

// The text pre-filled for "Ask the teacher" on a post: the school's template
// (or the default) with {teacher}, {title} and {date} filled in.
export function askMessage(update, teacher) {
  const date = new Date(update.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const vars = { teacher: teacher?.name ? `${teacher.title || 'Ms.'} ${teacher.name.split(' ')[0]}` : 'teacher', title: update.title, date };
  return (teacher?.message_template || DEFAULT_ASK).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

// onClick for WhatsApp links. In the app shell a target="_blank" link opens a
// new-window request the WebView doesn't hand to the shell, so the tap is
// lost. Navigating the page itself goes through the shell's navigation
// handler, which passes the link on to WhatsApp. Browsers keep the new tab.
export function openWhatsapp(e) {
  if (!window.TTShell) return;
  e.preventDefault();
  window.location.href = e.currentTarget.href;
}
