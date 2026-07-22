"use server";

import { db } from "@/lib/db";
import { chapitres, echeances } from "@/lib/schema";
import { revalidatePath } from "next/cache";

export async function createChapterAction(data: {
  matiereId: string;
  nom: string; // Titre du chapitre reçu du formulaire
  dateJ0: Date; // Date de départ (J0)
  dateExamen: Date; // Date d'examen (limite stricte)
  cadencier: number[]; // Ex: [0, 1, 3, 7, 14, 30] (les jours du cycle)
}) {
  await db.transaction(async (tx) => {
    // 1. Insertion dans la table 'chapitres' (colonnes: titre, matiereId)
    const [newChapter] = await tx
      .insert(chapitres)
      .values({
        titre: data.nom,
        matiereId: data.matiereId,
      })
      .returning();

    // 2. Génération des échéances basées sur le cadencier
    const echeancesToInsert = data.cadencier
      .map((dayOffset) => {
        const d = new Date(data.dateJ0);
        d.setDate(d.getDate() + dayOffset);

        // Règle d'intégrité : Aucune échéance le jour de l'examen ou après
        if (d >= data.dateExamen) return null;

        return {
          chapitreId: newChapter.id,
          date: d,
          cycleDay: dayOffset,
          status: "normal",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 3. Insertion dans la table 'echeances'
    if (echeancesToInsert.length > 0) {
      await tx.insert(echeances).values(echeancesToInsert);
    }
  });

  revalidatePath("/planning");
  return { success: true };
}
