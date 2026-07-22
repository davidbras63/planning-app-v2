"use client";

import { useState } from 'react';
import { Stack, Group, Button } from '@mantine/core';
import { Calendar } from 'lucide-react';
// Importation de tes actions serveurs
import { actionDecalerChapitre } from '@/app/actions/planningLogic';
import { updateEcheanceAction } from '@/app/actions/planningUpdates';
import { recalculerCadencierComplet } from '@/app/actions/recalculerCadencier';

export default function PlanningView({ chapitres, refreshData }: { chapitres: any[], refreshData: () => Promise<void> }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const changeWeek = (dir: number) => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (dir * 7));
      return next;
    });
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string, chapter: any) => {
    e.preventDefault();
    
    // 1. Déplacement J0 -> Logique planning (actionDecalerChapitre)
    // On utilise chapter.current_step pour identifier le J0
    if (chapter.current_step === 0) {
      // Le second argument est le décalage, à ajuster selon ta logique de calcul
      await actionDecalerChapitre(chapter.id, 0); 
    } 
    // 2. Déplacement Jx -> Update direct
    else {
      await updateEcheanceAction(chapter.id, new Date(targetDate));
    }
    
    await refreshData();
  };

  const handleFullRecalcul = async () => {
    await recalculerCadencierComplet();
    await refreshData();
  };

  return (
    <Stack>
      <Group>
        <Button onClick={() => changeWeek(-1)}>Semaine Précédente</Button>
        <Button onClick={() => changeWeek(1)}>Semaine Suivante</Button>
        <Button color="orange" onClick={handleFullRecalcul}>
          Recalculer tout le Cadencier
        </Button>
      </Group>

      {/* 
         Ici, tu conserves ton mapping existant pour l'affichage 
         et tu appelles 'handleDrop' dans tes zones de calendrier 
      */}
      
    </Stack>
  );
}