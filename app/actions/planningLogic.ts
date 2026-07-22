"use server";

import { db } from "@/db"; 
import { echeances } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function actionDecalerChapitre(chapitreId: string, decalageJours: number) {
  // 1. On récupère uniquement l'échéance du chapitre concerné
  const echeance = await db.select().from(echeances).where(eq(echeances.chapitreId, chapitreId));

  // 2. Si elle existe, on applique le glissement
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
