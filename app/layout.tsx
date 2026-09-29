import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ThemeScript from '@/components/theme/ThemeScript';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EV-ChargeOps',
    template: '%s | EV-ChargeOps',
  },
  description: 'ระบบจัดการเครื่องจักรชาร์จไฟฟ้าและงานซ่อมบำรุง',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: ThemeScript mutates className on <html> before
    // React hydrates, so the server and client HTML intentionally differ here.
    <html lang="th" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
