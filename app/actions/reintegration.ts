"use server";

import { db } from "@/db";
import { echeances, settings } from "@/db/schema";
import { eq, count, between, and, gte } from "drizzle-orm";

// Helper pour formater
const formatDate = (date: Date) => date.toISOString().split('T')[0];

export async function actionTenterReintegration(
  userId: string, 
  revisionId: string, 
  nextDueDate: Date, // Date du cycle suivant (J+n)
  examDate: Date // Date butoir de l'examen
) {
  // 1. Récupérer les réglages
  const userSettings = await db.select().from(settings).where(eq(settings.userId, userId)).get();
  const maxCoursParJour = userSettings?.maxDays ?? 5;

  // 2. Préparation des variables de recherche
  let dateTest = new Date();
  dateTest.setDate(dateTest.getDate() + 1); // Demain
  
  // Date interdite (J+2 du J suivant)
  const dateInterdite = new Date(nextDueDate);
  dateInterdite.setDate(dateInterdite.getDate() + 2);

  // 3. Boucle de recherche avec tes contraintes
  while (dateTest <= examDate) {
    
    // Contrainte A : Sauter les dimanches (0)
    if (dateTest.getDay() === 0) {
      dateTest.setDate(dateTest.getDate() + 1);
      continue;
    }

    // Contrainte B : Sauter J+2 du J suivant
    if (formatDate(dateTest) === formatDate(dateInterdite)) {
      dateTest.setDate(dateTest.getDate() + 1);
      continue;
    }

    // Vérifier la charge du jour
    const [chargeDuJour] = await db
      .select({ count: count() })
      .from(echeances)
      .where(eq(echeances.date, dateTest));

    if ((chargeDuJour?.count ?? 0) < maxCoursParJour) {
      // TROUVÉ ! On applique la réintégration automatiquement
      await db.update(echeances)
        .set({ date: dateTest, status: 'reintegre' })
        .where(eq(echeances.id, revisionId));
        
      return { success: true, date: dateTest };
    }

    // Sinon, jour suivant
    dateTest.setDate(dateTest.getDate() + 1);
  }

  // 4. Si on sort de la boucle, c'est qu'aucune place n'a été trouvée
  return { success: false, needsForce: true, message: "Pas de créneau disponible avant l'examen." };
}
