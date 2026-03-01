import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'HAFSA Terminal',
  description: 'HAFSA Terminal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mono.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#001616" />
        <script dangerouslySetInnerHTML={{ __html: `
          if (!window.Capacitor) {
            window.Capacitor = {
              triggerEvent: function() {},
              handleError: function() {},
              Plugins: {},
              platform: 'web',
              isNativePlatform: function() { return false; }
            };
          }
        `}} />
      </head>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
