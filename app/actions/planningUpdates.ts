"use server";

import { db } from "@/db";
import { echeances } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateEcheanceAction(id: string, newDate: Date) {
    try {
        // 1. Récupérer l'échéance déplacée
        const targetEcheance = await db.query.echeances.findFirst({
            where: eq(echeances.id, id),
        });

        if (!targetEcheance || !targetEcheance.date) {
            return { success: false, error: "Échéance introuvable" };
        }

        const oldDate = new Date(targetEcheance.date);
        const diffTime = newDate.getTime() - oldDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return { success: true };
        }

        // 2. Récupérer TOUTES les échéances de ce chapitre triées par ordre chronologique pour identifier le J0 (la première)
        const allEcheances = await db.select().from(echeances)
            .where(eq(echeances.chapitreId, targetEcheance.chapitreId))
            .orderBy(asc(echeances.date));

        const isJ0 = allEcheances.length > 0 && allEcheances[0].id === targetEcheance.id;

        if (isJ0) {
            // CAS 1 : C'est le J0 -> On décale TOUT le chapitre en cascade d'autant de jours
            for (const ech of allEcheances) {
                if (ech.date) {
                    const echDate = new Date(ech.date);
                    echDate.setDate(echDate.getDate() + diffDays);

                    await db.update(echeances)
                        .set({ date: echDate })
                        .where(eq(echeances.id, ech.id));
                }
            }
        } else {
            // CAS 2 : Ce n'est pas le J0 -> On ne bouge que l'échéance qu'on vient de glisser-déposer
            await db.update(echeances)
                .set({ date: newDate })
                .where(eq(echeances.id, id));
        }

        const { userId } = await auth();
		revalidatePath(`/protected/dashboard/${userId}`);
        return { success: true };
    } catch (error) {
        console.error("Erreur mise à jour échéance:", error);
        return { success: false, error: "Impossible de mettre à jour la date" };
    }
}

