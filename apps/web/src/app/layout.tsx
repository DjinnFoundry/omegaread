import type { Metadata, Viewport } from 'next';
import { Literata, Special_Elite, Atkinson_Hyperlegible } from 'next/font/google';
import './globals.css';

const literata = Literata({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-literata',
});

const specialElite = Special_Elite({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-typewriter',
  weight: '400',
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lectura-accesible',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'ZetaRead — Lectura adaptativa para ninos',
  description:
    'Historias personalizadas que se adaptan al nivel de tu hijo. Comprension lectora medible, progreso visible. Open source, AGPL-3.0.',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'ZetaRead — Lectura adaptativa para ninos',
    description:
      'Historias personalizadas que se adaptan al nivel de tu hijo. Comprension lectora medible, progreso visible.',
    siteName: 'ZetaRead',
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
    <html lang="es" className={`${literata.variable} ${specialElite.variable} ${atkinson.variable}`}>
      <body className="min-h-screen bg-fondo text-texto antialiased">
        {children}
      </body>
    </html>
  );
}
