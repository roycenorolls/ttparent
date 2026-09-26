import './globals.css';
import { Fredoka, Nunito } from 'next/font/google';
import BottomNav from '@/components/BottomNav';

// Fredoka (rounded) for headings, names and buttons; Nunito for body text.
// Both keep the app feeling young and friendly for preschool parents.
// Self-hosted by next/font so there's no render-blocking request and no
// layout shift.
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'TutorTime',
  description: 'TutorTime Parent App',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    // The inline script tags <html> before first paint, so the class isn't in
    // the server markup — hence suppressHydrationWarning.
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* The app shell exposes window.TTShell; tag it so CSS can drop the
            safe-area insets the shell already applies. */}
        <script dangerouslySetInnerHTML={{ __html: "if(window.TTShell)document.documentElement.classList.add('tt-shell')" }} />
      </head>
      <body>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
