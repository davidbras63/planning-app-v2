"use server";

import { db } from "@/db";
import { echeances } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";

/**
 * Recalcule le cadencier complet pour un chapitre donné.
 * @param chapitreId - L'ID du chapitre concerné.
 * @param cyclesSouhaites - Un tableau d'objets { cycleDay: number, date: string } 
 * qui représente la nouvelle configuration voulue.
 */
export async function actionRecalculerCadencierComplet(
  chapitreId: string, 
  cyclesSouhaites: { cycleDay: number, date: string }[]
) {
  // 1. Récupérer toutes les échéances existantes pour ce chapitre
  const existantes = await db
    .select()
    .from(echeances)
    .where(eq(echeances.chapitreId, chapitreId));

  const cyclesSouhaitesIds = cyclesSouhaites.map(c => c.cycleDay);

  // 2. SUPPRESSION : Supprimer les cycles qui ne sont plus dans la liste (ceux que l'utilisateur a retirés)
  await db
    .delete(echeances)
    .where(
      and(
        eq(echeances.chapitreId, chapitreId),
        notInArray(echeances.cycleDay, cyclesSouhaitesIds)
      )
    );

  // 3. AJOUT / MODIFICATION : Boucle sur les cycles souhaités
  for (const cycle of cyclesSouhaites) {
    const existeDeja = existantes.find(e => e.cycleDay === cycle.cycleDay);

    if (existeDeja) {
      // Si le cycle existe, on met à jour la date (sans toucher aux notes/autres colonnes)
      await db
        .update(echeances)
        .set({ date: cycle.date })
        .where(eq(echeances.id, existeDeja.id));
    } else {
      // Si le cycle est nouveau, on l'insère
      await db.insert(echeances).values({
        chapitreId: chapitreId,
        date: cycle.date,
        cycleDay: cycle.cycleDay,
      });
    }
  }

  return { success: true };
}
