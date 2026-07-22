"use client";

import { useEffect, Suspense } from 'react';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Container, Title, Text, Button, Stack, Grid, Card, Group } from '@mantine/core';
import { CreditCard } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const GridAny = Grid as any;

// Composant isolé pour gérer l'alerte de recherche
function AuthAlertHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('auth_alert') === 'true') {
      alert("Connectez-vous avant d'accéder à cette page !");
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  return null;
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) return null;

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '60px 20px' }}>
      <Suspense fallback={null}>
        <AuthAlertHandler />
      </Suspense>

      <Container size="lg">
        {/* HERO */}
        <Stack align="center" gap="md" mb={80} style={{ textAlign: 'center' }}>
          <Title order={1} size="h1" style={{ fontSize: '3rem' }}>Ton cerveau, organisé pour la réussite.</Title>
          <Text size="xl" c="dimmed" maw={700}>
            La seule plateforme qui combine planification, répétition espacée et analyse de données pour piloter tes révisions comme un pro.
          </Text>
         
          <div style={{ marginTop: '20px' }}>
            {!isSignedIn ? (
              <Group gap="md">
                <SignUpButton mode="modal"><Button size="lg" color="indigo">Démarrer l'essai (3 jours offerts)</Button></SignUpButton>
                <SignInButton mode="modal"><Button size="lg" variant="default">Se connecter</Button></SignInButton>
              </Group>
            ) : (
              <Button size="lg" color="indigo" onClick={() => router.push('/protected/dashboard')}>Accéder à mon espace</Button>
            )}
          </div>
        </Stack>

        {/* EXPLICATION DU FONCTIONNEMENT */}
        <GridAny gutter="xl" justify="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card withBorder shadow="sm" p="lg">
              <Title order={3} mb="md">Comment ça marche ?</Title>
              <Stack gap="sm">
                <Text><b>1. Planifie sans surcharger :</b> Définis ton rythme. Tu règles tes seuils de réintégration et ton nombre de cours max : l'app gère la charge pour toi.</Text>
                <Text><b>2. Saisie tes notes :</b> À chaque fin de session, rentre tes notes. Le système calcule tes moyennes en temps réel.</Text>
                <Text><b>3. Détection automatique :</b> Si tu es sous ton seuil, le chapitre bascule en "Réintégration". Le tableau de bord le met en priorité haute.</Text>
                <Text><b>4. Analyse tes courbes :</b> Visualise tes progrès via des graphiques dynamiques : tes erreurs deviennent tes points de progression.</Text>
              </Stack>
              
              <Card mt="xl" bg="indigo.9" p="md" radius="sm">
                <Text c="white">
                  <b>Essai gratuit :</b> Tu as 3 jours pour tout tester. Ton travail est conservé en mémoire pendant cette période, te laissant le temps de décider de passer en Premium.
                </Text>
              </Card>
            </Card>
          </Grid.Col>
        </GridAny>

        {/* SECTION PAIEMENT / STRIPE */}
        <Card withBorder mt={80} p="xl" bg="dark" c="white">
          <Stack align="center" gap="xs">
            <CreditCard size={48} color="#4f46e5" />
            <Title order={2}>Accès Premium Illimité</Title>
            <Text c="gray.4" ta="center" maw={500}>
              Débloque la conservation de tes données, les statistiques avancées, et un suivi illimité de tes chapitres.
            </Text>
            <Button
              size="lg"
              color="indigo"
              mt="md"
              onClick={() => window.location.href = '/api/stripe/create-checkout-session'}
            >
              Passer au Premium
            </Button>
            <Text size="xs" c="gray.6" mt="md">Paiement sécurisé via Stripe</Text>
          </Stack>
        </Card>
      </Container>
    </main>
  );
}
