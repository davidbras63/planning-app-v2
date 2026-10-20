'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function processReferral(input: any) {
  const { userId: clerkId } = await auth();

  // Extraction propre du code qu'il soit envoyé en string directe ou dans un objet
  const code = typeof input === 'string' ? input : input?.code || input?.affiliateCode;

  console.log('🚀 [SERVER ACTION] Valeur brute reçue :', input);
  console.log('🚀 [SERVER ACTION] Code extrait :', code, '| Clerk ID :', clerkId);

  if (!clerkId || !code) {
    console.log('❌ [SERVER ACTION] Arrêt : Données incomplètes (clerkId ou code vide).');
    return { success: false, error: 'Missing clerkId or code' };
  }

  try {
    const result = await db
      .update(users)
      .set({ 
        referredBy: String(code) 
      })
      .where(eq(users.clerkId, clerkId))
      .returning();

    console.log('✅ [SERVER ACTION] Succès total - Ligne mise à jour dans Neon :', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ [SERVER ACTION] Erreur SQL Neon fatale :', error);
    return { success: false, error };
  }
}