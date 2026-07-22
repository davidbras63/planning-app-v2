"use client";

import { useState } from 'react';
import { Container, Title, Card, TextInput, NumberInput, Button, Table, Group, Stack, Text } from '@mantine/core';
import { Calculator, Save } from 'lucide-react';
import { saveSettingsAction, recalculerCadencierAction } from '@/app/actions/settingsActions';

export default function SettingsView({ initialData, userId }: { initialData: any[], userId: string }) {
  // Initialisation à partir des données reçues en props
  const [cadencier, setCadencier] = useState(() => initialData.find(i => i.key === 'cadencier')?.value || '1,4,7,14,30');
  const [joursMax, setJoursMax] = useState<number>(Number(initialData.find(i => i.key === 'jours_max')?.value) || 5);
  const [loading, setLoading] = useState(false);

  const listeDesJours = cadencier.split(',').map(j => j.trim()).filter(j => j !== '' && !isNaN(Number(j)));
  const [seuilsParJour, setSeuilsParJour] = useState<Record<string, number>>(() => {
    const temp: Record<string, number> = {};
    initialData.forEach(item => {
      if (item.key.startsWith('seuil_J_')) {
        const jour = item.key.replace('seuil_J_', '');
        temp[jour] = Number(item.value);
      }
    });
    return temp;
  });

  const handleSave = async () => {
    setLoading(true);
    const payload = [
      { key: 'cadencier', value: cadencier },
      { key: 'jours_max', value: joursMax.toString() },
      ...listeDesJours.map(jour => ({ 
        key: `seuil_J_${jour}`, 
        value: (seuilsParJour[jour] || 10).toString() 
      }))
    ];
    await saveSettingsAction(userId, payload);
    setLoading(false);
    alert("Enregistré !");
  };

  return (
    <Container fluid p="xl">
       {/* Ton rendu JSX ici (celui de ton fichier original) */}
       {/* Assure-toi de remplacer les appels 'supabase' par les fonctions importées au début */}
       <Button loading={loading} onClick={handleSave}>Enregistrer</Button>
    </Container>
  );
}