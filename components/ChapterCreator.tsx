// components/ChapterCreator.tsx
"use client";
import { useMockUser } from '@/lib/fakeAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, Title, Flex, Select, TextInput, Button, SimpleGrid } from '@mantine/core';
import { useUser } from '@clerk/nextjs';

interface ChapterCreatorProps {
  onCreated: () => void;
}

export default function ChapterCreator({ onCreated }: ChapterCreatorProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: realUser, isLoaded: realIsLoaded } = useUser();
  const { user, isLoaded } = useMockUser(realUser, realIsLoaded);
  useEffect(() => {
    supabase
      .from('subjects')
      .select('*')
      .then(({ data }) => setSubjects(data || []));
  }, []);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // 1. Enregistrement du chapitre
    const { error } = await supabase
      .from('chapters')
      .insert([{
        subject_id: formData.get('subject_id'),
        title: formData.get('title'),
        j0_date: formData.get('j0'),
        exam_date: formData.get('exam')
      }]);

    setLoading(false);

    if (!error) {
      alert("Chapitre généré !");
      onCreated(); // Rafraîchit le planning global
      e.currentTarget.reset(); // Vide le formulaire
    } else {
      console.error("Erreur lors de la création :", error);
    }
  };

  // On transforme le tableau de matières pour le format attendu par le Select de Mantine ({ value, label })
  const selectData = subjects.map((s) => ({
    value: String(s.id),
    label: s.name
  }));

  return (
    <Card withBorder shadow="sm" p="lg" radius="md" bg="var(--mantine-color-body)">
      <Title order={3} size="h4" mb="md" fw={600}>
        Créer un nouveau chapitre
      </Title>

      <form onSubmit={handleGenerate}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md" verticalSpacing="xs">
          
          {/* Sélection de la Matière */}
          <Select
            label="Matière"
            name="subject_id"
            placeholder="Choisir une matière"
            data={selectData}
            required
            searchable
          />

          {/* Nom du Chapitre */}
          <TextInput
            label="Nom du chapitre"
            name="title"
            placeholder="Ex: Cœur 1"
            required
          />

          {/* Date J0 */}
          <TextInput
            type="date"
            label="Date J0"
            name="j0"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />

          {/* Date Examen */}
          <TextInput
            type="date"
            label="Date Examen"
            name="exam"
            required
          />

          {/* Bouton de Soumission */}
          <Flex align="flex-end">
            <Button 
              type="submit" 
              fullWidth 
              loading={loading}
              color="indigo.6"
            >
              Générer Planning
            </Button>
          </Flex>

        </SimpleGrid>
      </form>
    </Card>
  );
}
