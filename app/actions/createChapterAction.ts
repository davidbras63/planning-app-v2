"use server";

import { db } from "@/db";
import { chapitres, echeances, settings, matieres } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export async function createChapterAction(input: any) {
  try {
    const { userId } = await auth();

    const titre = input?.titre || input?.nom || input?.title || input?.chapterTitle || Object.values(input || {}).find((val) => typeof val === "string" && val.trim().length > 0) || "";
    const matiereId = Number(input?.matiereId);
    const dateJ0Str = input?.dateJ0;
    const dateExamenStr = input?.dateExamen;

    if (!matiereId || !titre || !dateJ0Str) {
      return { success: false, error: "Paramètres ou matière manquants pour créer le chapitre." };
    }

    const dateJ0 = new Date(dateJ0Str);
    if (isNaN(dateJ0.getTime())) {
      return { success: false, error: "Format de date J0 invalide." };
    }

    const dateExamen = dateExamenStr ? new Date(dateExamenStr) : null;

    let cadencier: number[] = [];
    if (userId) {
      const userSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.clerkId, userId))
        .limit(1);

      if (userSettings.length > 0 && userSettings[0]?.cadencier) {
        const rawCadencier = userSettings[0].cadencier;
        if (Array.isArray(rawCadencier)) {
          const parsed = rawCadencier.map(Number).filter((n) => !isNaN(n));
          if (parsed.length > 0) {
            cadencier = parsed;
          }
        }
      }
    }

    if (cadencier.length === 0) {
      cadencier = [0, 1, 3, 7, 14, 30];
    }

    const [newChapitre] = await db
      .insert(chapitres)
      .values({
        matiereId,
        titre,
        dateExamen: dateExamen ? formatDateOnly(dateExamen) : null,
        clerkId: userId || null,
      })
      .returning();

    if (!newChapitre || !newChapitre.id) {
      return { success: false, error: "Echec de l'insertion du chapitre en base." };
    }

    const echeancesToInsert = [];

    for (const delaiJour of cadencier) {
      const targetDate = new Date(dateJ0);
      targetDate.setDate(targetDate.getDate() + delaiJour);

      if (dateExamen && targetDate >= dateExamen) {
        break;
      }

      echeancesToInsert.push({
        chapitreId: newChapitre.id,
        date: formatDateOnly(targetDate),
        stepName: `J${delaiJour}`,
        cycleDay: delaiJour,
        clerkId: userId || null,
      });
    }

    if (echeancesToInsert.length > 0) {
      await db.insert(echeances).values(echeancesToInsert);
    }

    return { success: true, chapitreId: newChapitre.id };
  } catch (error: any) {
    console.error("ERREUR CRITIQUE SUR CREATE_CHAPTER:", error);
    return { success: false, error: String(error?.message || error) };
  }
}