'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { processReferral } from '@/app/actions/referral';

function TrackerLogic() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    const codeFromUrl = searchParams.get('affiliate') || searchParams.get('ref');
    if (codeFromUrl) {
      localStorage.setItem('affiliate_code', codeFromUrl);
    }
  }, [searchParams]);

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

export function AffiliateTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerLogic />
    </Suspense>
  );
}