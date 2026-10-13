'use server';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function processReferral() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return;

  const cookieStore = await cookies();
  const affiliateCode = cookieStore.get('affiliate_ref')?.value;

  if (!affiliateCode) return;

  try {
    await db
      .update(users)
      .set({ referredBy: affiliateCode })
      .where(and(eq(users.clerkId, clerkId), isNull(users.referredBy)));
  } catch (error) {
    console.error("Erreur enregistrement parrainage :", error);
  }
}