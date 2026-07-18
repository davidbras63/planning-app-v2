'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Tant qu'on n'est pas côté client, on affiche juste les enfants sans aucune logique.
  // Cela empêche Vercel de planter pendant le build.
  if (!isClient) {
    return <>{children}</>;
  }

  // Ici, on est sûrs d'être dans le navigateur, on peut mettre la logique en sécurité
  return <TrialGuardContent>{children}</TrialGuardContent>;
}

// Composant séparé pour gérer la logique une fois qu'on est côté client
function TrialGuardContent({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    const protectedRoutes = ['/dashboard', '/planning', '/graphiques', '/settings'];
    if (!user && protectedRoutes.includes(pathname)) {
      router.push('/');
    }
  }, [isLoaded, user, pathname, router]);

  return <>{children}</>;
}