import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OmegaAnywhere — Aprende jugando',
  description:
    'Plataforma educativa open source para niños de 4-8 años. Lectura, números y más, en español.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFF9F0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-fondo text-texto antialiased">
        {children}
      </body>
    </html>
  );
}
