'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { processReferral } from '@/actions/referral'; // Ajuste le chemin du fichier si besoin

export function AffiliateTracker() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    // 1. On attend que Clerk soit prêt ET que l'utilisateur soit bien connecté
    if (!isLoaded || !userId) return;

    // 2. On récupère le code d'affiliation stocké
    const affiliateCode = localStorage.getItem('affiliate_code');
    if (!affiliateCode) return;

    // 3. On déclenche l'action serveur
    async function runReferral() {
      try {
        const res = await processReferral(affiliateCode);
        if (res?.success) {
          localStorage.removeItem('affiliate_code');
        }
      } catch (err) {
        console.error('Erreur parrainage:', err);
      }
    }

    runReferral();
  }, [isLoaded, userId]);

  return null;
}