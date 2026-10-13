'use server';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function processReferral(clientCode?: string | null) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return;

  // 1. On cherche d'abord dans le cookie
  const cookieStore = await cookies();
  let affiliateCode = cookieStore.get('affiliate_ref')?.value;

  // 2. Si le cookie a sauté pendant l'inscription Clerk, on prend le code sauvé dans le localStorage
  if (!affiliateCode && clientCode) {
    affiliateCode = clientCode;
  }

  if (!affiliateCode) return;

  try {
    await db
      .update(users)
      .set({ referredBy: affiliateCode })
      .where(and(eq(users.clerkId, clerkId), isNull(users.referredBy)));

    console.log("✅ Parrainage enregistré dans Neon :", affiliateCode);
  } catch (error) {
    console.error("❌ Erreur SQL Neon :", error);
  }
}