'use client';

import { Container, Title, Text, Button, Stack, Card } from '@mantine/core';
import { Lock, CreditCard, Mail, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';

export default function AccesRefuse() {
  const { signOut } = useClerk();

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
              href="/contact"
              variant="light"
              color="gray"
              fullWidth
              leftSection={<Mail size={16} />}
            >
              Contacter le support
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<LogOut size={16} />}
              onClick={() => signOut({ redirectUrl: '/' })}
              fullWidth
            >
              Se déconnecter
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Container>
  );
}