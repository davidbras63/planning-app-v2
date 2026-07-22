'use client';
import { useEffect, useState } from 'react';
import { checkAccessAction } from '@/app/actions/checkAccess';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const { hasAccess } = await checkAccessAction();
        setIsAllowed(hasAccess);
      } catch (error) {
        setIsAllowed(false);
      }
    }
    verify();
  }, []);

  if (isAllowed === null) return <div>Chargement sécurisé...</div>;
  if (!isAllowed) return <div>Accès refusé. Veuillez contacter le support.</div>;

  return <>{children}</>;
}