"use server";

import { db } from "@/db";
import { settings, links, echeances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function ensureUserInitialized(clerkId: string) {
    if (!clerkId) return;

    try {
        await db.insert(settings)
            .values({
                clerkId: clerkId,
                cadencier: [0, 1, 3, 7, 14, 30, 60, 90],
                seuilBasNote: [10, 10, 10, 10, 10, 10, 10, 10],
                seuilHautNote: [20, 20, 20, 20, 20, 20, 20, 20],
                maxCoursParJour: 5,
            })
            .onConflictDoNothing();

        await db.insert(links)
            .values({
                clerkId: clerkId,
            })
            .onConflictDoNothing();

    } catch (error) {
        console.error("Erreur lors de l'initialisation du profil utilisateur : ", error);
    }
}

export async function toggleEcheanceCompleted(id: number, completed: boolean) {
    try {
        await db
            .update(echeances)
            .set({ completed: completed })
            .where(eq(echeances.id, id));
            
        revalidatePath("/protected/planning");
        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'échéance :", error);
        return { success: false, error };
    }
}
