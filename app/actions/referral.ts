'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function processReferral(code: string) {
  const { userId: clerkId } = await auth();

  console.log('🚀 [SERVER ACTION] Déclenchée avec code :', code, '| Clerk ID :', clerkId);

  if (!clerkId || !code) {
    console.log('⚠️ [SERVER ACTION] Annulée : clerkId ou code manquant.');
    return;
  }

  try {
    const result = await db
      .update(users)
      .set({ referredBy: code })
      .where(and(eq(users.clerkId, clerkId), isNull(users.referredBy)))
      .returning();

    console.log('📊 [SERVER ACTION] Résultat UPDATE dans Neon :', result);
  } catch (error) {
    console.error('❌ [SERVER ACTION] Erreur SQL Neon :', error);
  }
}