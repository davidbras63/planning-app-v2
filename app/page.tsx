"use client";

import { useEffect } from 'react';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Container, Title, Text, Button, Stack, Grid, Card, Group } from '@mantine/core';
import { CreditCard, Clock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Système d'alerte : écoute si le middleware nous envoie un message
  useEffect(() => {
    if (searchParams.get('auth_alert') === 'true') {
      alert("Connectez-vous avant d'accéder à cette page !");
      // Nettoie l'URL pour ne pas réafficher l'alerte au rechargement
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  if (!isLoaded) return null;

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '60px 20px' }}>
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
                <SignUpButton mode="modal"><Button size="lg" color="indigo">Démarrer l'essai (30 min offertes)</Button></SignUpButton>
                <SignInButton mode="modal"><Button size="lg" variant="default">Se connecter</Button></SignInButton>
              </Group>
            ) : (
              <Button size="lg" color="indigo" onClick={() => router.push('/dashboard')}>Accéder à mon espace</Button>
            )}
          </div>
        </Stack>

        {/* EXPLICATION DU FONCTIONNEMENT */}
        <Grid gutter={{ base: 'xl'}}>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" p="lg" h="100%">
              <Title order={3} mb="md">Comment ça marche ?</Title>
              <Stack gap="sm">
                <Text><b>1. Planifie sans surcharger :</b> Définis ton rythme. Tu règles tes seuils de réintégration et ton nombre de cours max : l'app gère la charge pour toi.</Text>
                <Text><b>2. Saisie tes notes :</b> À chaque fin de session, rentre tes notes. Le système calcule tes moyennes en temps réel.</Text>
                <Text><b>3. Détection automatique :</b> Si tu es sous ton seuil, le chapitre bascule en "Réintégration". Le tableau de bord le met en priorité haute.</Text>
                <Text><b>4. Analyse tes courbes :</b> Visualise tes progrès via des graphiques dynamiques : tes erreurs deviennent tes points de progression.</Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" p="lg" h="100%" bg="indigo.5" c="white">
              <Group mb="md">
                <Clock size={30} />
                <Title order={3} c="white">La règle des 30 minutes</Title>
              </Group>
              <Text size="lg" fw={500} mb="md">Commence gratuitement et instantanément.</Text>
              <Text mb="md">
                Tu as 30 minutes pour tout tester : créer tes chapitres, organiser ton planning et voir la puissance de l'outil.
              </Text>
              <Card bg="indigo.9" p="md" radius="sm">
                <Text size="sm" c="indigo.1">
                  <b>Pas de pression :</b> Si tu n'as pas fini au bout de 30 minutes, ton travail est <b>conservé en mémoire pendant 48 heures</b>. Le temps pour toi de décider de passer en Premium avant que les données ne soient supprimées.
                </Text>
              </Card>
            </Card>
          </Grid.Col>
        </Grid>

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
