"use server";

import { db } from "@/db";
import { echeances, individualNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * 1. Action pour forcer la réintégration à une date choisie manuellement
 * (Crée le vrai "R" dans le planning et met le statut)
 */
export async function actionForcerReintegration(
  echeanceId: string, 
  chapitreId: string, 
  cycleDay: number, 
  nouvelleDate: Date,
  stepNameActuel: string
) {
  try {
    const stepRecherche = stepNameActuel.includes("R") ? stepNameActuel : `${stepNameActuel} R`;

    // On crée la nouvelle échéance "R" de force à la date choisie
    await db.insert(echeances).values({
      chapitreId: Number(chapitreId),
      stepName: stepRecherche,
      date: nouvelleDate,
      cycleDay: Number(cycleDay),
      status: 'reintegre',
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur lors du forçage de la réintégration :", error);
    return { success: false, message: "Erreur serveur lors du forçage." };
  }
}

