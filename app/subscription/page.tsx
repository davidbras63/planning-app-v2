'use client';

import { useState, useEffect } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { Button, Container, Text, Card, Stack, Title, Group } from '@mantine/core';
import { IconCreditCard, IconArrowLeft, IconSparkles, IconCheck, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();

  const executeCheckout = async () => {
    setLoading(true);
    setDrawerOpened(false);

    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Erreur:', data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && drawerOpened && !successState) {
      const isPending = localStorage.getItem('pending_checkout');
      if (isPending) {
        localStorage.removeItem('pending_checkout');
        setSuccessState(true);
        setTimeout(() => {
          executeCheckout();
        }, 1500);
      }
    }
  }, [isLoaded, isSignedIn, drawerOpened, successState, user]);

  const handleCheckout = async () => {
    if (!isSignedIn) {
      localStorage.setItem('pending_checkout', 'true');
      setSuccessState(false);
      setDrawerOpened(true);
     
      openSignIn({
        forceRedirectUrl: window.location.origin + '/subscription',
        fallbackRedirectUrl: window.location.origin + '/subscription',
        afterSignInUrl: window.location.origin + '/subscription',
        afterSignUpUrl: window.location.origin + '/subscription',
      });
      return;
    }

    await executeCheckout();
  };

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Group mb="md">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => router.push('/')}
        >
          Retour à l'acceuil
        </Button>
      </Group>

      <Card shadow="md" radius="md" p="xl" withBorder style={{ width: '100%' }}>
        <Stack gap="lg">
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(78, 70, 229, 0.1)', padding: '12px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSparkles size={32} color="#4f46e5" />
            </div>
            <Title order={2} c="white" mt="md">Bienvenue sur Nesis</Title>
            <Text c="dimmed" style={{ lineHeight: 1.6, opacity: 0.8 }} mt="sm">
              Poursuivez l'aventure ! Pour continuer à piloter vos révisions sereinement, débloquez l'accès complet et illimité à toutes les fonctionnalités.
            </Text>
          </div>

          <Card p="lg" radius="md" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Text fw={500} c="white">Formule unique</Text>
            <Text size="xl" fw={700} c="indigo" mt="xs">7,90 € / mois</Text>
            <Text size="sm" c="dimmed">(sans engagement, résiliable à tout moment)</Text>
          </Card>

          <Stack gap="xs">
            <Button
              size="lg"
              color="indigo"
              fullWidth
              loading={loading}
              leftSection={<IconCreditCard size={20} />}
              onClick={handleCheckout}
            >
              S'abonner - 7,90 € / mois
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              En vous abonnant, vous acceptez nos{' '}
              <Link href="/cgv" target="_blank" style={{ color: '#818cf8', textDecoration: 'underline' }}>
                Conditions Générales de Vente
              </Link>
            </Text>
          </Stack>
        </Stack>
      </Card>

      {/* Panneau latéral forcé au premier plan absolu (z-index 99999) pour ne jamais être assombri par le fond de Clerk */}
      {drawerOpened && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#1a1b1e',
          color: '#fff',
          boxShadow: '-15px 0 40px rgba(0, 0, 0, 0.8)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header du panneau */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Title order={4} c="white" style={{ flex: 1 }}>Connexion requise</Title>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              onClick={() => setDrawerOpened(false)}
              style={{ color: '#fff' }}
            >
              <IconX size={20} />
            </Button>
          </div>

          {/* Contenu du panneau */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <Stack gap="md">
              {!successState ? (
                <>
                  <Text size="sm" c="dimmed">
                    Pour procéder à l'abonnement, veuillez vous connecter à votre compte existant ou en créer un via la fenêtre qui vient de s'ouvrir.
                  </Text>
                  <Card p="md" radius="md" style={{ backgroundColor: 'rgba(78, 70, 229, 0.1)', border: '1px solid rgba(78, 70, 229, 0.2)' }}>
                    <Text size="sm" c="white" fw={500}>1. Connectez-vous ou inscrivez-vous sur le module.</Text>
                    <Text size="sm" c="dimmed" mt={4}>2. Dès que c'est validé, la transition vers le paiement se fera automatiquement ici.</Text>
                  </Card>
                </>
              ) : (
                <Stack align="center" py="xl" gap="md">
                  <div style={{ background: 'rgba(40, 199, 111, 0.1)', padding: '16px', borderRadius: '50%', display: 'inline-flex' }}>
                    <IconCheck size={40} color="#28c76f" />
                  </div>
                  <Title order={3} c="white">Opération réussie !</Title>
                  <Text size="sm" c="dimmed" ta="center">
                    Votre compte est opérationnel. Redirection vers le module de paiement sécurisé Lemon Squeezy en cours...
                  </Text>
                </Stack>
              )}
            </Stack>
          </div>
        </div>
      )}
    </Container>
  );
}