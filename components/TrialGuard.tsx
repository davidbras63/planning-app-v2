"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // 1. Logique du Timer (ton code d'origine)
  useEffect(() => {
    const checkTimer = () => {
      const timer = localStorage.getItem('trial_timer');
      if (timer === "0" && pathname !== '/') {
        router.push('/');
      }
    };
    const interval = setInterval(checkTimer, 5000);
    return () => clearInterval(interval);
  }, [router, pathname]);

  // 2. Logique de protection connexion (la nouvelle sécurité)
  useEffect(() => {
    const protectedRoutes = ['/dashboard', '/planning', '/graphiques', '/settings'];
    
    // Si l'utilisateur est chargé, non connecté, et tente d'aller sur une page protégée
    if (isLoaded && !user && protectedRoutes.includes(pathname)) {
      alert("Connectez-vous avant d'accéder à cette page !");
      router.push('/');
    }
  }, [pathname, user, isLoaded, router]);

  return <>{children}</>;
}
