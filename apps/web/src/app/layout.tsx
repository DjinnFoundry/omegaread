import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'OmegaRead — Lectura adaptativa para ninos',
  description:
    'Historias personalizadas que se adaptan al nivel de tu hijo. Comprension lectora medible, progreso visible. Open source, AGPL-3.0.',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
  openGraph: {
    title: 'OmegaRead — Lectura adaptativa para ninos',
    description:
      'Historias personalizadas que se adaptan al nivel de tu hijo. Comprension lectora medible, progreso visible.',
    siteName: 'OmegaRead',
    locale: 'es_ES',
    type: 'website',
  },
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
    <html lang="es" className={nunito.variable}>
      <body className="min-h-screen bg-fondo text-texto antialiased">
        {children}
      </body>
    </html>
  );
}
