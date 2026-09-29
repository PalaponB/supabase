import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
