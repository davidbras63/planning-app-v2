import { auth } from "@clerk/nextjs/server";
import { getAnalyticsData } from "@/app/actions/analyticsActions";
import AnalyticsView from "@/components/AnalyticsView";

export default async function AnalyticsPage() {
  // 1. Récupération propre de l'ID utilisateur
  const { userId } = await auth();

  // 2. Sécurité : si pas d'utilisateur, on affiche un message au lieu de rediriger
  if (!userId) {
    return <div>Veuillez vous reconnecter pour voir les graphiques.</div>;
  }

  // 3. Récupération des données avec l'ID utilisateur
  const data = await getAnalyticsData(userId);

  // 4. Rendu de la vue
  return <AnalyticsView initialData={data} />;
}
