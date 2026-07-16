"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Title, Table, TextInput, Button, Stack } from '@mantine/core';

interface GradeInputProps {
  chapitresDuJour: any[];
  onCalculated: () => void;
}

export default function GradeInput({ chapitresDuJour, onCalculated }: GradeInputProps) {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const handleCalculateAverages = async () => {
    // 1. Récupérer les seuils de réglage depuis la base pour comparer dynamiquement
    const { data: settings } = await supabase.from('settings').select('min_note'); 
    // On suppose que le seuil par défaut est la première ligne ou qu'il y a une logique spécifique
    const seuil = settings && settings.length > 0 ? settings[0].min_note : 10;

    for (const chapId in notes) {
      const notesArray = notes[chapId].split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
      if (notesArray.length === 0) continue;

      const notesToInsert = notesArray.map(val => ({
        chapter_id: chapId,
        note_value: val,
        revision_type: 'J'
      }));

      await supabase.from('individual_notes').insert(notesToInsert);

      const moyenne = notesArray.reduce((a, b) => a + b, 0) / notesArray.length;

      // 2. Mise à jour de la moyenne
      await supabase.from('chapters').update({ last_average: moyenne }).eq('id', chapId);

      // 3. LOGIQUE DYNAMIQUE : On utilise le seuil récupéré des réglages
      if (moyenne < seuil) {
        await supabase.from('chapters').update({ is_in_reintegration: true }).eq('id', chapId);
      } else {
        // Optionnel : on remet à false si la note remonte au-dessus du seuil
        await supabase.from('chapters').update({ is_in_reintegration: false }).eq('id', chapId);
      }
    }

    alert("Moyennes calculées avec vos seuils personnalisés !");
    setNotes({});
    onCalculated();
  };

  if (chapitresDuJour.length === 0) return null;

  return (
    <Card withBorder shadow="sm" p="lg" radius="md" bg="var(--mantine-color-body)">
      <Title order={3} size="h4" mb="md" fw={600}>Saisie des notes du jour</Title>
      <Stack gap="md">
        <Table variant="simple" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Chapitre</Table.Th>
              <Table.Th>Notes (ex: 12, 15, 08)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {chapitresDuJour.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td fw={500}>{c.title}</Table.Td>
                <Table.Td>
                  <TextInput
                    placeholder="Saisir les notes"
                    size="xs"
                    value={notes[c.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCalculateAverages(); }}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Button color="green.6" onClick={handleCalculateAverages} fullWidth mt="sm">
          Calculer et Enregistrer les moyennes
        </Button>
      </Stack>
    </Card>
  );
}
