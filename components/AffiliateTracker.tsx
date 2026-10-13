'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { processReferral } from '@/app/actions/referral';

export function AffiliateTracker() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();

  // 1. Capture du paramètre ?affiliate= dans l'URL dès l'arrivée
  useEffect(() => {
    const codeFromUrl = searchParams.get('affiliate') || searchParams.get('ref');
    if (codeFromUrl) {
      localStorage.setItem('affiliate_code', codeFromUrl);
    }
  }, [searchParams]);

  // 2. Traitement du parrainage une fois l'utilisateur connecté
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const affiliateCode = localStorage.getItem('affiliate_code');
    if (!affiliateCode) return;

    async function runReferral() {
      try {
        const res = await processReferral(affiliateCode);
        if (res?.success) {
          localStorage.removeItem('affiliate_code');
        }
      } catch (err) {
        console.error("Erreur parrainage:", err);
      }
    }

    runReferral();
  }, [isLoaded, userId]);

  return null;
}