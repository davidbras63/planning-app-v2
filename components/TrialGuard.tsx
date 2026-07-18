'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si Clerk n'a pas fini de charger, on ne fait rien, on laisse charger
    if (!isLoaded) return;

    // Si l'utilisateur n'est PAS connecté, on le renvoie à la connexion
    // SAUF s'il est déjà sur la page de connexion
    if (!isSignedIn && pathname !== '/sign-in') {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  // Si Clerk charge, on affiche un message d'attente (évite le vide)
  if (!isLoaded) return <div>Chargement...</div>;

  // Si l'utilisateur est connecté, on affiche le contenu
  if (isSignedIn) {
    return <>{children}</>;
  }

  // Si non connecté, on ne retourne rien (ou une page vide) en attendant la redirection
  return null;
}