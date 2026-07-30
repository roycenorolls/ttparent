import './globals.css';
import BottomNav from '@/components/BottomNav';

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
    <html lang="en">
      <body>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
