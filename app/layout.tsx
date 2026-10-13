import '@mantine/core/styles.css';
import './globals.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import { AffiliateTracker } from '@/components/AffiliateTracker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: 'window.lemonSqueezyAffiliateConfig = { store: "nesis" };',
          }}
        />
        <script src="https://lemonsqueezy.com/affiliate.js" defer></script>
      </head>
      <body>
        <ClerkProvider>
          <AffiliateTracker />
          <MantineProvider defaultColorScheme="dark">
            {children}
          </MantineProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}