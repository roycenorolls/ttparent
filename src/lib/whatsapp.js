// Link for a WhatsApp button: a chat with `number` (country code, digits only)
// when there is one, otherwise just the WhatsApp app. The bare link has to name
// the "send" host: Android's WhatsApp ignores a plain whatsapp://, so the
// button did nothing there.
export function whatsappLink(number) {
  return number ? `https://wa.me/${number}` : 'whatsapp://send';
}

// Teacher phones are stored as local Indonesian numbers (08…); wa.me wants 62….
export function teacherWhatsappLink(phone) {
  return whatsappLink(phone && `62${phone.replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '')}`);
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
