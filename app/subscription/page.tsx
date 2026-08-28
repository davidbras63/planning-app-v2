'use client';

import { Container, Title, Text, Button, Stack, Card } from '@mantine/core';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const router = useRouter();

  const handleCheckout = () => {
    window.location.href = '/api/stripe/create-checkout-session';
  };

  return (
    <main style={{ backgroundColor: '#141517', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Container size="sm" style={{ width: '100%' }}>
        <Card withBorder p="xl" radius="md" shadow="sm" style={{ backgroundColor: '#212226', borderColor: '#2f3136' }}>
          <Stack align="center" gap="lg" style={{ textAlign: 'center' }}>
            
            <div style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#818cf8', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={32} />
            </div>

            <Stack gap={8}>
              <Title order={2} c="white">Bienvenue sur Nésis App</Title>
              <Text c="white" size="sm" fw={500} style={{ lineHeight: 1.6, opacity: 0.9 }}>
                Heureux de voir que l'application vous plaît ! Pour continuer à piloter vos révisions sereinement, débloquez l'accès complet et illimité à toutes les fonctionnalités.
              </Text>
            </Stack>

            <Card p="md" radius="md" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Text size="sm" c="white">
                <b>Formule unique :</b> 9,90 € / mois (sans engagement, résiliable à tout moment)
              </Text>
            </Card>

            <Stack gap="xs" style={{ width: '100%' }} mt="md">
              <Button
                size="lg"
                color="indigo"
                fullWidth
                leftSection={<CreditCard size={18} />}
                onClick={handleCheckout}
              >
                S'abonner — 9,90 € / mois
              </Button>

              <Button
                size="md"
                variant="subtle"
                color="gray"
                fullWidth
                leftSection={<ArrowLeft size={16} />}
                onClick={() => router.push('/')}
                style={{ color: '#a1a1aa' }}
              >
                Retour à l'accueil
              </Button>
            </Stack>

          </Stack>
        </Card>
      </Container>
    </main>
  );
}