// layout.tsx (racine)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body>
          <MantineProvider theme={theme}>
            {/* On retire le TrialGuard d'ici pour le build */}
            {children}
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
