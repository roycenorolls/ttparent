export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: '☀️', sub: 'Wishing you a wonderful day ahead.' };
  if (hour >= 12 && hour < 18) return { text: 'Good afternoon', icon: '🌤', sub: 'Hope your day is going well.' };
  return { text: 'Good evening', icon: '🌙', sub: "Have a good rest — you've earned it." };
}

export function isEvening() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 5;
}

export function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function formatTime(str) {
  if (!str) return '—';
  const [h, m] = str.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}
