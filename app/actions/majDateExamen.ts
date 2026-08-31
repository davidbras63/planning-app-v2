'use server';

import { db } from "@/db";
import { chapitres, matieres, settings as settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { actionRecalculerCadencierComplet } from "@/app/actions/recalculerCadencier"; // Ajuste le chemin si besoin

export async function majDateExamen(chapitreId: number, nouvelleDateExamen: Date) {
    try {
        // 1. Mettre à jour la date d'examen du chapitre ciblé
        await db.update(chapitres)
            .set({ dateExamen: nouvelleDateExamen })
            .where(eq(chapitres.id, chapitreId));

        // 2. Récupérer le dossier (folderId) et la matière de ce chapitre pour pouvoir recalculer
        const chapitreData = await db.select({
            matiereId: chapitres.matiereId,
            folderId: matieres.folderId,
            clerkId: matieres.clerkId // ou récupéré via le user si besoin
        })
        .from(chapitres)
        .leftJoin(matieres, eq(chapitres.matiereId, matieres.id))
        .where(eq(chapitres.id, chapitreId))
        .limit(1);

        if (chapitreData.length > 0 && chapitreData[0].folderId) {
            const folderId = chapitreData[0].folderId;
            const clerkId = chapitreData[0].clerkId || "";

            // 3. Récupérer le cadencier actuel depuis les settings de la base
            const currentSettings = await db.select()
                .from(settingsTable)
                .where(eq(settingsTable.clerkId, clerkId))
                .limit(1);

            const cadencierActuel = currentSettings.length > 0 ? currentSettings[0].cadencier : [1, 3, 7, 14, 30]; // Valeur par défaut si besoin

            // 4. Lancer automatiquement le recalcul complet pour ce dossier
            await actionRecalculerCadencierComplet(clerkId, folderId, cadencierActuel);
        }

        return { success: true };
    } catch (err: any) {
        console.error("Erreur lors de la mise à jour de la date d'examen et du recalcul :", err);
        return { success: false, message: err.message };
    }
}

