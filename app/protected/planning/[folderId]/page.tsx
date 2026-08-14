import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPlanningData } from "@/app/actions/planningLogic";
import { revalidatePath } from "next/cache";
import PlanningView from "@/components/PlanningView";
import { Container, Stack, Title, Divider } from "@mantine/core";
import ChapterCreator from "@/components/ChapterCreator";

// Action serveur pour rafraîchir la page côté serveur
async function refreshAction(folderId: string) {
    "use server";
    revalidatePath(`/protected/planning/${folderId}`);
}

export default async function PlanningPage({ params }: { params: Promise<{ folderId: string }> }) {
    const { folderId } = await params; // Récupère l'ID du dossier proprement

    const { userId } = await auth();
    if (!userId) return <div>Veuillez vous reconnecter</div>;

    // On passe le folderId à la fonction au lieu de userId
    const data = await getPlanningData(folderId); 
    const chapitres = data.chapitres;
    const cadencier = data.cadencier;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            paddingLeft: '24px',
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
                        <ChapterCreator/>
                    </div>

                    <Divider my="md" color="var(--mantine-color-dark-4)" />

                    {/* 2. Vue Planning (Composant Client) */}
                    <div style={{ width: '100%' }}>
                        <PlanningView
                            chapitres={chapitres}
                            refreshData={folderId}
                        />
                    </div>

                </Stack>
            </div>
        </div>
    );
}
