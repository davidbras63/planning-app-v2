import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, AppShell } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import dynamic from 'next/dynamic'; // <-- Ajoute cette ligne

// Importe la Sidebar de manière dynamique pour qu'elle ne soit pas rendue côté serveur
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });

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
