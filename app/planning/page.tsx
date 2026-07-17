// app/planning/page.tsx
"use client";

import { useState } from 'react';
import { Container, Stack, Title, Divider } from '@mantine/core';
import ChapterCreator from '@/components/ChapterCreator';
import PlanningView from '@/components/PlanningView';
const ChapterCreatorAny = ChapterCreator as any;

export default function PlanningPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'flex-start',
      paddingLeft: '280px', // Laisse la place pour ta barre latérale
      paddingRight: '24px', 
      paddingTop: '24px', 
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <div style={{ flex: 1, width: '100%', maxWidth: '100%' }}>
        <Stack gap="xl" style={{ width: '100%' }}>
          
          {/* 1. EN HAUT : Création de chapitre sur TOUTE la largeur */}
          <div style={{ width: '100%' }}>
            <Title order={3} size="h4" mb="sm" c="dimmed">Gestion des cours</Title>
            <ChapterCreatorAny onChapterCreated={() => setRefreshKey(k => k + 1)} />
          </div>

          <Divider my="md" color="var(--mantine-color-dark-4)" />

          {/* 2. AU MILIEU ET EN BAS : Ta vue Planning large */}
          <div style={{ width: '100%' }}>
            <PlanningView key={refreshKey} />
          </div>
          
        </Stack>
      </div>
    </div>
  );
}
