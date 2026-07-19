// app/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Container, Title, Card, TextInput, NumberInput, Button, Table, Group, Stack, Text, Box } from '@mantine/core';
import { Calculator, Save } from 'lucide-react';
import { actionRecalculer } from '@/app/actions';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const router = useRouter();
 
  // Paramètres généraux
  const [cadencier, setCadencier] = useState('1,4,7,14,30');
  const [joursMax, setJoursMax] = useState<number>(5);
 
  // Stockage des seuils sous forme d'objet : { "1": 10, "4": 12, "7": 14, ... }
  const [seuilsParJour, setSeuilsParJour] = useState<Record<string, number>>({});

  // 1. Charger la configuration depuis Supabase
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('settings').select('key, value');
      if (data) {
        const tempSeuils: Record<string, number> = {};
        data.forEach(item => {
          if (item.key === 'cadencier') setCadencier(item.value);
          if (item.key === 'jours_max') setJoursMax(Number(item.value));
          // Si la clé commence par seuil_J_ (ex: seuil_J_4)
          if (item.key.startsWith('seuil_J_')) {
            const jour = item.key.replace('seuil_J_', '');
            tempSeuils[jour] = Number(item.value);
          }
        });
        setSeuilsParJour(tempSeuils);
      }
    }
    loadSettings();
  }, []);

  // 2. Extraire la liste des jours à partir de ce que tu tapes dans le cadencier
  const listeDesJours = cadencier
    .split(',')
    .map(j => j.trim())
    .filter(j => j !== '' && !isNaN(Number(j)));

  // Mettre à jour le seuil d'un jour précis dans l'état local
  const handleSeuilChange = (jour: string, valeur: number) => {
    setSeuilsParJour(prev => ({ ...prev, [jour]: valeur }));
  };

  // 3. Sauvegarder l'intégralité du cadencier et des seuils par J
  const handleSaveSettings = async () => {
    setLoading(true);
   
    // On prépare les données de base
    const settingsData = [
      { key: 'cadencier', value: cadencier },
      { key: 'jours_max', value: joursMax.toString() },
    ];

    // On ajoute dynamiquement chaque seuil configuré pour les J présents
    listeDesJours.forEach(jour => {
      const valeurSeuil = seuilsParJour[jour] !== undefined ? seuilsParJour[jour] : 10; // 10 par défaut si non défini
      settingsData.push({ key: `seuil_J_${jour}`, value: valeurSeuil.toString() });
    });

    const { error } = await supabase.from('settings').upsert(settingsData, { onConflict: 'key' });
    setLoading(false);

    if (error) alert("Erreur d'enregistrement : " + error.message);
    else alert("Cadencier et seuils par jour enregistrés avec succès !");
  };

  // 4. Lancement du script de calcul du cadencier
  const handleCalculerCadencier = async () => {
    setCalculating(true);
    try {
      // Ton appel actionRecalculer rapatrié ici
      await actionRecalculer("id_chapitre", 1, "2026-07-20");
      alert("Calcul réussi !");
      router.refresh();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Container fluid p="xl">
      <Stack gap="lg">
        <Title order={1} size="h2" fw={700}>
          Réglages des Cycles & Seuils par Jour
        </Title>

        <Card withBorder shadow="sm" radius="md" p="xl" bg="var(--mantine-color-body)">
          <Stack gap="md">
           
            {/* Blocs de configuration du haut */}
            <Group grow align="flex-start">
              <Stack gap="xs">
                <TextInput
                  label="Cadencier de révision"
                  description="Ajoute tes jours séparés par des virgules (ex: 1,4,7,14)"
                  value={cadencier}
                  onChange={(e) => setCadencier(e.target.value)}
                />
                {/* Le bouton est maintenant juste sous la saisie */}
                <Button
                  color="orange.6"
                  leftSection={<Calculator size={16} />}
                  loading={calculating}
                  onClick={handleCalculerCadencier}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Recalculer Cadencier
                </Button>
              </Stack>
              
              <NumberInput
                label="Nombre de jours max"
                description="Limite maximale réglable"
                value={joursMax}
                onChange={(val) => setJoursMax(Number(val))}
                min={1}
              />
            </Group>

            {/* Tableau dynamique des Seuils de Note par J */}
            <Text fw={600} size="sm" mt="md">Notes seuils requises par étape du cadencier</Text>
           
            <Table withTableBorder withColumnBorders style={{ backgroundColor: 'var(--mantine-color-dark-8)' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 180 }}>Étape du Cadencier</Table.Th>
                  <Table.Th>Règle appliquée</Table.Th>
                  <Table.Th style={{ width: 200 }}>Note seuil de validation (/20)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {listeDesJours.map((jour, index) => (
                  <Table.Tr key={`jour-${index}`}>
                    <Table.Td style={{ fontWeight: 600 }}>
                      Jour J + {jour}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        Note minimale à obtenir au QCM de J+{jour} pour valider l'étape et passer à la suivante.
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        size="xs"
                        min={0}
                        max={20}
                        step={0.5}
                        placeholder="Ex: 12"
                        value={seuilsParJour[jour] !== undefined ? seuilsParJour[jour] : 10}
                        onChange={(val) => handleSeuilChange(jour, Number(val))}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
                {listeDesJours.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3} style={{ textAlign: 'center' }}>
                      <Text size="sm" c="dimmed" p="xs">Saisis des jours dans ton cadencier ci-dessus pour générer les seuils.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            {/* Actions de bas de page */}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                leftSection={<Save size={16} />}
                loading={loading}
                onClick={handleSaveSettings}
              >
                Enregistrer la configuration
              </Button>
            </Group>

          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
