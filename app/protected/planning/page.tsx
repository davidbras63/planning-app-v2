import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPlanningData } from "@/app/actions/planningActions";
import { revalidatePath } from "next/cache";
import PlanningView from "@/components/PlanningView";
import { Container, Stack, Title, Divider } from '@mantine/core';
import ChapterCreator from '@/components/ChapterCreator';

// Action serveur pour rafraîchir la page côté serveur
async function refreshAction() {
  "use server";
  revalidatePath("/protected/planning");
}

export default async function PlanningPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // Récupération des données côté serveur
  const chapitres = await getPlanningData(userId);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-start',
      paddingLeft: '280px', 
      paddingRight: '24px',
      paddingTop: '24px',
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <div style={{ flex: 1, width: '100%', maxWidth: '100%' }}>
        <Stack gap="xl" style={{ width: '100%' }}>
          
          {/* 1. Création de chapitre */}
          <div style={{ width: '100%' }}>
            <Title order={3} size="h4" mb="sm" c="dimmed">Gestion des cours</Title>
            <ChapterCreator />
          </div>

          <Divider my="md" color="var(--mantine-color-dark-4)" />

          {/* 2. Vue Planning (Composant Client) */}
          <div style={{ width: '100%' }}>
            <PlanningView 
              chapitres={chapitres} 
              refreshData={refreshAction} 
            />
          </div>

        </Stack>
      </div>
    </div>
  );
}
