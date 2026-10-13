import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // <--- 1. On importe les cookies
import LandingContent from '@/components/LandingContent';

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; affiliate?: string }>; // <--- 2. On ajoute affiliate ici
}) {
  const { userId } = await auth();
  const resolvedSearchParams = await searchParams;
  const fromMenu = resolvedSearchParams.from === 'menu';
  const affiliate = resolvedSearchParams.affiliate; // <--- 3. On récupère la valeur dans l'URL

  // 4. Si un code d'affiliation est présent dans l'URL, on le stocke dans un cookie (valable 7 jours par exemple)
  if (affiliate) {
    const cookieStore = await cookies();
    cookieStore.set('affiliate_code', affiliate, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  // Si l'utilisateur est connecté et qu'il ne vient pas du menu, on le jette direct sur le dashboard sans aucun flash
  if (userId && !fromMenu) {
    redirect('/protected/dashboard');
  }

  // Sinon, on affiche ta page d'accueil
  return <LandingContent />;
}