import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { matieres, chapitres } from "@/db/schema";
import { eq } from "drizzle-orm";
import AnalyticsView from "@/components/AnalyticsView";
import { getMatiereGraphDataComplete, getChapitreGraphDataComplete } from "@/app/actions/get-stats";

interface PageProps {
  params: {
    folderId: string;
  };
}

export default async function AnalyticsPage({ params }: PageProps) {
  // 1. Récupération dynamique du folderId depuis l'URL
  const { folderId } = await params;
  const numericFolderId = Number(folderId);

  // 2. Récupération propre de l'ID utilisateur Clerk
  const { userId } = await auth();

  // 3. Sécurité : si pas d'utilisateur connecté
  if (!userId) {
    return <div>Veuillez vous reconnecter pour voir les graphiques.</div>;
  }

  // 4. Récupération des matières de ce dossier spécifique depuis la base de données
  const dbMatieres = await db
    .select()
    .from(matieres)
    .where(eq(matieres.folderId, numericFolderId));

  const matieresList = dbMatieres.map((m) => ({
    value: m.id.toString(),
    label: m.nom,
    folderId: m.folderId,
  }));

  // 5. Récupération de tous les chapitres liés aux matières de ce dossier
  const matiereIds = dbMatieres.map((m) => m.id);
  
  let chapitresList: { value: string; label: string; matiereId: number }[] = [];

  if (matiereIds.length > 0) {
    // On va chercher les chapitres de ces matières
    const allChapitres = await db.select().from(chapitres);
    
    chapitresList = allChapitres
      .filter((c) => c.matiereId !== null && matiereIds.includes(c.matiereId))
      .map((c) => ({
        value: c.id.toString(),
        label: c.titre,
        matiereId: c.matiereId as number,
      }));
  }

  // 6. Fonctions passe-plat pour alimenter le composant client en données graphiques à la demande
  async function handleGetMatiereData(matiereId: number) {
    "use server";
    const res = await getMatiereGraphDataComplete(matiereId, numericFolderId, userId);
    return {
      chartData: res.chartData,
      average: res.matiereAverage,
      totalQcm: res.totalQcm,
    };
  }

  async function handleGetChapitreData(chapitreId: number) {
    "use server";
    const res = await getChapitreGraphDataComplete(chapitreId, userId);
    return {
      chartData: res.chartData,
      average: res.chapitreAverage,
      totalQcm: res.totalQcm,
    };
  }

  // 7. Rendu de la vue client avec les listes et les actions injectées
  return (
    <AnalyticsView
      matieresList={matieresList}
      chapitresList={chapitresList}
      getMatiereData={handleGetMatiereData}
      getChapitreData={handleGetChapitreData}
    />
  );
}
