"use server";

import { db } from "@/db";
import { chapitres, echeances, matieres, settings } from "@/db/schema";
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
    return { success: false, message: "Echéance non trouvée" };
}

// 2. La fonction getPlanningData pour récupérer les chapitres et le cadencier
export async function getPlanningData(folderId: string) {
    if (!folderId) {
        return { chapitres: [], cadencier: [0, 1, 3, 7, 14, 30] };
    }
    try {
        const matieresDossier = await db.select().from(matieres).where(eq(matieres.folderId, Number(folderId) as any));
        const matiereIds = matieresDossier.map(m => m.id);

        let chapitresData = [];
        if (matiereIds.length > 0) {
            chapitresData = await db.query.chapitres.findMany({
                where: (chapitres, { inArray }) => inArray(chapitres.matiereId, matiereIds),
                with: {
                    matiere: true,
                    echeances: true,
                },
            });
        }
		console.log("CHAPITRES RECUPERES :", JSON.stringify(chapitresData, null, 2));

        const userSettings = await db.query.settings.findFirst();
        console.log("--> Settings trouvés dans la base :", userSettings);

        if (!userSettings) {
            console.warn("ATTENTION : Aucun réglage trouvé pour l'utilisateur.");
        }


        return {
            chapitres: chapitresData,
            cadencier: userSettings?.cadencier ?? [0, 1, 3, 7, 14, 30],
        };
    } catch (error) {
        console.error("Erreur récupération données :", error);
        return { chapitres: [], cadencier: [0, 1, 3, 7, 14, 30] };
    }
}