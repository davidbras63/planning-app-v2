'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { processReferral } from '@/app/actions/referral';

export function AffiliateTracker() {
  const { isLoaded, userId } = useAuth();

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