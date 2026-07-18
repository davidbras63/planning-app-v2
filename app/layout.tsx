'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js'; // Assure-toi d'importer ton client

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      supabase.from('user_status')
        .select('status')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          // Si le statut est expiré, on envoie vers /subscription
          if (data?.status === 'trial_expired') {
            router.push('/subscription'); 
          } else {
            setIsAllowed(true);
          }
          setLoading(false);
        });
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [isLoaded, user, router]);

  if (loading) return <div>Chargement...</div>;

  return <>{children}</>;
}

