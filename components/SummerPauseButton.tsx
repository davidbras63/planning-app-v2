'use client';

import { useState } from 'react';
import { Button, Stack } from '@mantine/core';
import { IconSun } from '@tabler/icons-react';

export default function SummerPauseButton() {
  const [loading, setLoading] = useState(false);

  const handleSummerPause = async () => {
    // 1. Vérification de la date au moment du clic (du 25 juin au 31 août de l'année en cours)
    const now = new Date();
    const currentYear = now.getFullYear();
    const june25 = new Date(currentYear, 5, 25);
    const august31 = new Date(currentYear, 7, 31, 23, 59, 59);

    if (now < june25 || now > august31) {
      alert("La pause estivale est uniquement active du 25 juin au 31 août !");
      return;
    }

    // 2. Demande de confirmation avant l'appel API
    if (!confirm('Voulez-vous activer votre pause estivale ? Aucun prélèvement ne sera effectué, et l\'abonnement reprendra le 3 septembre.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pause-summer', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert('Pause estivale activée avec succès !');
        window.location.reload();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap={4} align="flex-start" p="xs">
      <Button
        onClick={handleSummerPause}
        loading={loading}
        fullWidth
        size="xs"
        leftSection={<IconSun size={16} />}
        style={{
          backgroundColor: '#facc15', // Jaune soleil vif (Tailwind yellow-400)
          color: '#000000', // Texte noir pour un contraste maximal
          fontWeight: 600,
        }}
        styles={{
          root: {
            '&:hover': {
              backgroundColor: '#eab308', // Jaune un peu plus foncé au survol (yellow-500)
            },
          },
        }}
      >
        Summer Pause
      </Button>
    </Stack>
  );
}
