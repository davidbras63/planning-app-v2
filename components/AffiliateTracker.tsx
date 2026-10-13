'use client';

import { useEffect } from 'react';
import { processReferral } from '@/app/actions/referral';

export default function AffiliateTracker() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliate = urlParams.get('affiliate') || urlParams.get('via');

      console.log('🔍 [TRACKER CLIENT] Code dans URL :', affiliate);

      if (affiliate) {
        localStorage.setItem('nesis_affiliate_ref', affiliate);
        console.log('🔍 [TRACKER CLIENT] Code sauvegardé en LocalStorage :', affiliate);
        processReferral(affiliate);
      } else {
        const savedAffiliate = localStorage.getItem('nesis_affiliate_ref');
        console.log('🔍 [TRACKER CLIENT] Code récupéré depuis LocalStorage :', savedAffiliate);
        if (savedAffiliate) {
          processReferral(savedAffiliate);
        }
      }
    }
  }, []);

  return null;
}