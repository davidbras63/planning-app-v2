"use server";

import { db } from "@/db";
import { echeances } from "@/db/schema";
import { eq } from "drizzle-orm";

// 1. Fonction pour décaler un chapitre
export async function actionDecalerChapitre(chapterId: string, decalageJours: number) {
  const echeance = await db.select().from(echeances).where(eq(echeances.chapitreId, chapterId));

  if (echeance && echeance.length > 0) {
    const ancienneDate = new Date(echeance[0].date);
    const nouvelleDate = new Date(ancienneDate);
    nouvelleDate.setDate(nouvelleDate.getDate() + decalageJours);

    await db
      .update(echeances)
      .set({ date: nouvelleDate.toISOString() })
      .where(eq(echeances.id, echeance[0].id));

    return { success: true };
  }
  return { success: false, message: "Échéance non trouvée" };
}

// 2. La fonction getPlanningData qui manquait pour le chargement
export async function getPlanningData(userId: string) {
  try {
    const data = await db.select().from(echeances).where(eq(echeances.userId, userId));
    return data;
  } catch (error) {
    console.error("Erreur récupération données :", error);
    return [];
  }
}
