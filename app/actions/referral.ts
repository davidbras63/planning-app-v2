'use server';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function processReferral() {
  const { userId: clerkId } = await auth();
  console.log("🔍 DEBUG REFERRAL - Clerk ID trouvé :", clerkId);

  if (!clerkId) return;

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log("🍪 DEBUG REFERRAL - Tous les cookies dispo côté serveur :", allCookies);

  const affiliateCode = cookieStore.get('affiliate_ref')?.value;
  console.log("🎯 DEBUG REFERRAL - Valeur du cookie affiliate_ref :", affiliateCode);

  if (!affiliateCode) {
    console.log("❌ ERREUR : Aucun cookie affiliate_ref trouvé par l'action serveur !");
    return;
  }

  try {
    const result = await db
      .update(users)
      .set({ referredBy: affiliateCode })
      .where(and(eq(users.clerkId, clerkId), isNull(users.referredBy)));
    
    console.log("✅ SUCCÈS : Base Neon mise à jour avec le parrain :", affiliateCode);
  } catch (error) {
    console.error("❌ ERREUR SQL NEON :", error);
  }
}