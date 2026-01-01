import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/components/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SiagaSekitar - Notifikasi Bencana Alam',
  description: 'Sistem notifikasi bencana alam berbasis lokasi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
