'use server';

import { db } from '@/db'; // Ton instance Drizzle
import { userCustomization } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function saveUserCustomization(data: {
  bgColor?: string | null;
  bgImage?: string | null;
  bgZoom?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Non autorisé');

  await db
    .insert(userCustomization)
    .values({
      clerkId: userId,
      bgColor: data.bgColor,
      bgImage: data.bgImage,
      bgZoom: data.bgZoom || 'cover',
    })
    .onConflictDoUpdate({
      target: userCustomization.clerkId,
      set: {
        bgColor: data.bgColor,
        bgImage: data.bgImage,
        bgZoom: data.bgZoom || 'cover',
        updatedAt: new Date().toISOString(),
      },
    });

  return { success: true };
}

// AJOUTE CETTE FONCTION ICI :
export async function getUserCustomization() {
  const { userId } = await auth();
  if (!userId) return null;

  const result = await db
    .select()
    .from(userCustomization)
    .where(eq(userCustomization.clerkId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}