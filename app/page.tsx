import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import LandingContent from '@/components/LandingContent'; // Assure-toi que le chemin correspond à là où tu as rangé ton fichier

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { userId } = await auth();
  const resolvedSearchParams = await searchParams;
  const fromMenu = resolvedSearchParams.from === 'menu';

  // Si l'utilisateur est connecté et qu'il ne vient pas du menu, on le jette direct sur le dashboard sans aucun flash
  if (userId && !fromMenu) {
    redirect('/protected/dashboard');
  }

  // Sinon, on affiche ta page d'accueil (ton ancien fichier renommé)
  return <LandingContent />;
}