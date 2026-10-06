"use server";

import { db } from "@/db";
import { echeances } from "@/db/schema";
import { sql, eq, asc } from "drizzle-orm";
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
            // On prépare les cas pour mettre à jour toutes les échéances d'un coup en une seule requête SQL
            const cases = allEcheances
                .filter(ech => ech.date)
                .map(ech => {
                    const echDate = new Date(ech.date!);
                    echDate.setDate(echDate.getDate() + diffDays);
                    // Format SQL de la date pour PostgreSQL (Neon)
                    const formattedDate = echDate.toISOString().slice(0, 19).replace('T', ' ');
                    return sql`WHEN ${echeances.id} = ${ech.id} THEN ${formattedDate}::timestamp`;
                });

            if (cases.length > 0) {
                const ids = allEcheances.map(ech => ech.id);
                
                await db.execute(sql`
                    UPDATE ${echeances}
                    SET date = CASE 
                        ${sql.join(cases, sql` `)}
                        ELSE date 
                    END
                    WHERE id IN (${sql.join(ids, sql`, `)})
                `);
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

