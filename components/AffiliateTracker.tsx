'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { processReferral } from '@/app/actions/referral';

function TrackerLogic() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();

  // 1. On pose un COOKIE au lieu du localStorage (résiste aux redirections privées)
  useEffect(() => {
    const codeFromUrl = 
      searchParams.get('affiliate') || 
      searchParams.get('ref') || 
      searchParams.get('code') || 
      searchParams.get('parrain');

    if (codeFromUrl) {
      // Cookie valide 7 jours, accessible sur tout le site
      document.cookie = `affiliate_code=${codeFromUrl}; path=/; max-age=604800; SameSite=Lax`;
      console.log("🎯 [TRACKER] Code parrain stocké dans un cookie :", codeFromUrl);
    }
  }, [searchParams]);

  // 2. Fonction utilitaire pour lire le cookie
  function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
  }

  // 3. Envoi vers la base dès que l'utilisateur est connecté
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const affiliateCode = getCookie('affiliate_code');
    if (!affiliateCode) return;

    async function runReferral() {
      try {
        console.log("🚀 [TRACKER] Envoi du code parrain (depuis cookie) :", affiliateCode);
        const res = await processReferral(affiliateCode);
        
        if (res?.success) {
          // Supprime le cookie après succès
          document.cookie = 'affiliate_code=; path=/; max-age=0';
          console.log("✅ [TRACKER] Parrainage enregistré et cookie nettoyé !");
        }
      } catch (err) {
        console.error("❌ [TRACKER] Erreur critique :", err);
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