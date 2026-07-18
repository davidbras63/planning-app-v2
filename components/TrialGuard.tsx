'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si Clerk n'a pas fini de charger, on ne fait rien
    if (!isLoaded) return;

    const protectedRoutes = ['/dashboard', '/planning', '/graphiques', '/settings'];

    // 1. Protection contre les non-connectés
    if (!user && protectedRoutes.includes(pathname)) {
      router.push('/');
    }

    // 2. Note pour la suite : C'est ici que tu ajouteras l'appel Supabase 
    // pour vérifier si le statut est 'trial_expired'.
    
  }, [isLoaded, user, pathname, router]);

  return <>{children}</>;
}
