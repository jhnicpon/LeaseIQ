import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { CrispChat } from '@/components/ui/CrispChat';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'LeaseIQ — Never Miss a Lease Deadline Again',
  description: 'AI-powered commercial lease management. Extract critical terms, track deadlines, and get alerts before options expire.',
  openGraph: {
    title: 'LeaseIQ — Never Miss a Lease Deadline Again',
    description: 'AI-powered commercial lease management for real estate teams.',
    type: 'website',
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased">
        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}

        <Providers>{children}</Providers>
        <CrispChat />
        <Analytics />
      </body>
    </html>
  );
}
