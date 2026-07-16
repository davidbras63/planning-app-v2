import '@mantine/core/styles.css';
import { ClerkProvider } from '@clerk/nextjs';
import { MantineProvider, AppShell, AppShellNavbar, AppShellMain, createTheme } from '@mantine/core';
import './globals.css';
import Sidebar from '../components/Sidebar';
import TrialGuard from '../components/TrialGuard'; // <-- Import ici

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body>
          <MantineProvider theme={theme} forceColorScheme="dark">
            <TrialGuard> {/* <-- Entoure ton AppShell avec le gardien */}
              <AppShell
                navbar={{
                  width: { base: 80, sm: 260 },
                  breakpoint: 'sm',
                }}
                padding="md"
              >
                <AppShellNavbar>
                  <Sidebar />
                </AppShellNavbar>
                <AppShellMain>
                  {children}
                </AppShellMain>
              </AppShell>
            </TrialGuard>
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

