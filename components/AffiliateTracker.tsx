'use client';

import { useEffect } from 'react';
import { processReferral } from '@/app/actions/referral';

export default function AffiliateTracker() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliate = urlParams.get('affiliate') || urlParams.get('via');

      if (affiliate) {
        // On stocke en localStorage au cas où Clerk dégage l'URL pendant la connexion
        localStorage.setItem('nesis_affiliate_ref', affiliate);
        // On essaie de l'envoyer direct au cas où l'utilisateur est déjà connecté
        processReferral(affiliate);
      } else {
        // Si l'URL n'a plus le paramètre (après la redirection Clerk), on regarde dans le storage
        const savedAffiliate = localStorage.getItem('nesis_affiliate_ref');
        if (savedAffiliate) {
          processReferral(savedAffiliate).then(() => {
            localStorage.removeItem('nesis_affiliate_ref');
          });
        }
      }
    }
  }, []);

  return null;
}