import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, AppShell } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import Sidebar from '@/components/Sidebar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <head>
          <ColorSchemeScript />
        </head>
        <body>
          <MantineProvider defaultColorScheme="dark">
            <AppShell
              navbar={{ width: 300, breakpoint: 'sm' }}
              padding="md"
            >
              <AppShell.Navbar>
                <Sidebar />
              </AppShell.Navbar>
              <AppShell.Main>
                {children}
              </AppShell.Main>
            </AppShell>
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
