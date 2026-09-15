'use client';

import { useState, useEffect } from 'react';
import { Button, Text, Stack } from '@mantine/core';
import { IconSun } from '@tabler/icons-react';

export default function SummerPauseButton() {
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isActiveUser, setIsActiveUser] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 1. Vérification de la date (du 25 juin au 31 août de l'année en cours)
    const now = new Date();
    const currentYear = now.getFullYear();
    const june25 = new Date(currentYear, 5, 25);
    const august31 = new Date(currentYear, 7, 31);
    const dateOk = now >= june25 && now <= august31;
    setIsAvailable(dateOk);

    // 2. Vérification du statut en base via une petite route ou en interrogeant l'API
    async function checkStatus() {
      try {
        const res = await fetch('/api/check-user-status'); // Ou une route qui renvoie le statut
        const data = await res.json();
        if (data.status === 'active') {
          setIsActiveUser(true);
        }
      } catch (err) {
        console.error('Erreur vérif statut', err);
      } finally {
        setChecked(true);
      }
    }

    checkStatus();
  }, []);

  // Si on n'a pas fini de charger, ou si le mec n'est pas actif, ou si on n'est pas en période estivale, on n'affiche RIEN
  if (!checked || !isActiveUser || !isAvailable) {
    return null;
  }

  const handleSummerPause = async () => {
    if (!confirm('Voulez-vous activer votre pause estivale ? Aucun prélèvement ne sera effectué en juillet et en août, et votre accès sera prolongé jusqu\'au 5 septembre.')) {
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
        variant="light"
        color="orange"
        size="xs"
        leftSection={<IconSun size={16} />}
        loading={loading}
        onClick={handleSummerPause}
        fullWidth
      >
        Pause estivale
      </Button>
    </Stack>
  );
}

