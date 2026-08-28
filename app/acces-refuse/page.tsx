'use client';

import { Container, Title, Text, Button, Stack, Card, Group } from '@mantine/core';
import { Lock, CreditCard, Home } from 'lucide-react';
import Link from 'next/link';

export default function AccesRefuse() {
  return (
    <Container size="xs" py={100}>
      <Card withBorder p="xl" radius="md" shadow="sm" ta="center">
        <Stack align="center" gap="md">
          <Lock size={48} color="#fa5252" />
          <Title order={2}>Accès restreint</Title>
          <Text c="dimmed" size="sm">
            Votre compte ne dispose pas d'un abonnement actif pour accéder à cette section. Veuillez souscrire à une offre pour débloquer l'accès.
          </Text>
          
          <Stack w="100%" mt="md" gap="sm">
            <Button
              component={Link}
              href="/subscription"
              color="indigo"
              leftSection={<CreditCard size={16} />}
              fullWidth
            >
              Voir les abonnements / Payer
            </Button>

            <Button
              component={Link}
              href="/"
              variant="default"
              leftSection={<Home size={16} />}
              fullWidth
            >
              Retour à l'accueil
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Container>
  );
}