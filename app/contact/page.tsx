'use client';

import { useState } from 'react';
import { Container, Title, Text, TextInput, Textarea, Button, Stack, Card, Group } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });

      if (response.ok) {
        alert('Message envoyé avec succès !');
        setEmail('');
        setMessage('');
      } else {
        alert("Erreur lors de l'envoi du message.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion au serveur.");
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        {/* Bouton de retour propre */}
        <div>
          <Button
            component={Link}
            href="/protected/dashboard"
            variant="subtle"
            leftSection={<ArrowLeft size={16} />}
            color="gray"
            p={0}
          >
            Retour à l'application
          </Button>
        </div>

        <Title order={2}>Contactez-nous</Title>
        <Text c="dimmed">
          Une question ? Remplis le formulaire ci-dessous pour nous envoyer un message.
        </Text>

        <Card component="form" onSubmit={handleSubmit} withBorder p="xl" radius="md">
          <Stack gap="md">
            <TextInput
              label="Votre e-mail"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Votre message"
              placeholder="Décrivez votre demande ici..."
              minRows={4}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              required
            />
            <Button 
              type="submit"
              color="indigo" 
              fullWidth
            >
              Envoyer le message
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
