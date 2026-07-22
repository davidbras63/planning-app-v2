import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAnalyticsData } from "@/app/actions/analyticsActions";
import AnalyticsView from "@/components/AnalyticsView";

export default async function AnalyticsPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // On récupère les données directement ici
  const data = await getAnalyticsData(userId);

  // On transmet les données au composant client
  return <AnalyticsView initialData={data} />;
}
