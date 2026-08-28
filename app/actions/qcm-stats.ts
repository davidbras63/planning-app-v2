'use server';

import { db } from '@/db'; // Adapte selon ton import
import { individualNotes, chapitres, matieres } from '@/db/schema'; // Adapte selon ton import
import { eq, and, sql } from 'drizzle-orm';

/**
 * 1. Compte le nombre total de notes (QCM) pour un chapitre
 */
export async function getChapitreQcmCount(chapitreId: number, clerkId: string) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let totalQcm = 0;
    rows.forEach((row) => {
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }
    });

    return { success: true, totalQcm };
  } catch (error) {
    console.error("Erreur comptage QCM chapitre :", error);
    return { success: false, totalQcm: 0 };
  }
}

/**
 * 2. Compte le nombre total de notes (QCM) pour toute une matière 
 * (en filtrant par le folderId de l'URL via les jointures)
 */
export async function getMatiereQcmCount(matiereId: number, folderId: number, clerkId: string) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .innerJoin(matieres, eq(chapitres.matiereId, matieres.id))
      .where(
        and(
          eq(matieres.id, matiereId),
          eq(matieres.folderId, folderId), // Sécurisation par le folderId
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let totalQcm = 0;
    rows.forEach((row) => {
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }
    });

    return { success: true, totalQcm };
  } catch (error) {
    console.error("Erreur comptage QCM matière :", error);
    return { success: false, totalQcm: 0 };
  }
}
