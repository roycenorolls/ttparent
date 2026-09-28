// Link for a WhatsApp button: a chat with `number` when there is one,
// otherwise WhatsApp's "Send to…" list so the parent picks the chat. There is
// no link that just opens WhatsApp on Android: a plain whatsapp:// is ignored
// and whatsapp://send without a number or text is rejected ("Couldn't open
// this chat link"), so the fallback carries a short greeting.
//
// Schools type numbers into the dashboard however they like (0812…, +62 812…,
// 62812…); wa.me needs 62812….
export function whatsappLink(number) {
  const local = String(number || '').replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
  return local ? `https://wa.me/62${local}` : 'whatsapp://send?text=Hello';
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
