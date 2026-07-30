import './globals.css';
import { Plus_Jakarta_Sans, Hanken_Grotesk } from 'next/font/google';
import BottomNav from '@/components/BottomNav';

// Plus Jakarta Sans for headings (friendly, rounded), Hanken Grotesk for
// body and UI labels (sharper, more professional). Self-hosted by next/font
// so there's no render-blocking request and no layout shift.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
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
    <html lang="en" className={`${jakarta.variable} ${hanken.variable}`}>
      <body>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
