"use server";

import { db } from "@/db";
import { echeances } from "@/db/schema"; // Ton schéma
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateEcheanceAction(id: string, newDate: Date) { 
  try {
    await db
      .update(echeances)
      .set({ date: newDate }) // <--- Correction : utilise 'date' et non 'next_review'
      .where(eq(echeances.id, id));

    revalidatePath('/protected/dashboard'); // Assure-toi que c'est bien ton chemin de route
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour échéance:", error);
    return { success: false, error: "Impossible de mettre à jour la date" };
  }
}
