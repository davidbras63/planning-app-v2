"use server";

import { db } from "@/db";
import { matieres, chapitres, echeances } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getDashboardData(userId: string) {
  // Récupération des matières, chapitres et échéances en une seule requête Drizzle
  const data = await db.query.matieres.findMany({
    where: eq(matieres.userId, userId),
    with: {
      chapitres: {
        with: {
          echeances: true,
        },
      },
    },
  });

  // Récupération des échéances avec le chapitre associé pour le tableau
  const rattrapages = await db.select()
    .from(echeances)
    .leftJoin(chapitres, eq(echeances.chapitreId, chapitres.id))
    .where(eq(echeances.status, 'normal'));

  return {
    folders: data,
    rattrapages: rattrapages
  };
}

export async function deleteDashboardItem(table: 'matieres' | 'chapitres' | 'echeances', id: string) {
  if (table === 'matieres') await db.delete(matieres).where(eq(matieres.id, id));
  if (table === 'chapitres') await db.delete(chapitres).where(eq(chapitres.id, id));
  if (table === 'echeances') await db.delete(echeances).where(eq(echeances.id, id));
  return { success: true };
}

export async function forceEcheancePlacement(id: string, newDate: Date, newCycleDay: number) {
  await db.update(echeances)
    .set({ date: newDate, cycleDay: newCycleDay, status: 'reintegre' })
    .where(eq(echeances.id, id));
  return { success: true };
}
