import { ClerkProvider } from '@clerk/nextjs';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Définis ton thème ici ou importe-le si tu l'as dans un fichier séparé
const theme = createTheme({});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body>
          <MantineProvider theme={theme}>
            {children}
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

