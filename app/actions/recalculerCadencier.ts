'use server';

import { db } from "@/db";
import { matieres, chapitres, echeances, settings as settingsTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function actionRecalculerCadencierComplet(clerkId: string, folderId: any, nouveauCadencier: number[]) {
    try {
        console.log(`🚀 Recalcul demandé pour clerkId: ${clerkId}, folderId:`, folderId, `nouveau cadencier:`, nouveauCadencier);

        const folderIdNum = folderId ? Number(folderId) : NaN;

         // 1. Mise à jour du cadencier dans les settings
        try {
            await db.update(settingsTable)
                .set({ cadencier: nouveauCadencier })
                .where(eq(settingsTable.clerkId, clerkId));
        } catch (settingsErr) {
            console.log("⚠️ Avertissement settings:", settingsErr);
        }

        // 2. On récupère les matières associées au dossier
        const matieresDuDossier = await db.select({ id: matieres.id })
            .from(matieres)
            .where(eq(matieres.folderId, folderIdNum));

        const matiereIds = matieresDuDossier.map(m => m.id);

        if (matiereIds.length === 0) {
            console.log("⚠️ Aucune matière trouvée pour ce dossier.");
            return { success: true };
        }

        // 3. On récupère TOUS les chapitres reliés à ces matières (avec leur dateExamen)
        const allChapitres = await db.select()
            .from(chapitres)
            .where(inArray(chapitres.matiereId, matiereIds));

        console.log(`📝 ${allChapitres.length} chapitres à traiter.`);

        // 4. Boucle propre sur chaque chapitre pour recalculer le cadencier
        for (const chap of allChapitres) {
            const rows = await db.select().from(echeances).where(eq(echeances.chapitreId, chap.id));
           
            const j0 = rows.find(r => Number(r.cycleDay) === 0 || r.stepName === 'J0');
            if (!j0) continue; // Si pas de J0, on passe au suivant

            const dateBase = new Date(j0.date);
            const dateExamenMax = chap.dateExamen ? new Date(chap.dateExamen) : null;

            // Nettoyage : supprime ce qui n'est plus dans le cadencier OU ce qui dépasse la date d'examen
            const idsASupprimer = rows
                .filter(r => {
                    const dayNum = Number(r.cycleDay);
                    const cadencierNums = nouveauCadencier.map((d: any) => Number(d));
                    
                    const horsCadencier = dayNum !== 0 && !cadencierNums.includes(dayNum);
                    const depasseExamen = dateExamenMax && new Date(r.date) >= dateExamenMax;

                    return horsCadencier || depasseExamen;
                })
                .map(r => r.id);

            if (idsASupprimer.length > 0) {
                await db.delete(echeances).where(inArray(echeances.id, idsASupprimer));
            }

            // Mise à jour ou création des jours du cadencier en respectant la date d'examen
            for (const jour of nouveauCadencier) {
                const nouvelleDate = new Date(dateBase);
                nouvelleDate.setDate(nouvelleDate.getDate() + jour);

                // Si une date d'examen existe et que l'échéance dépasse, on zappe ce jour
                if (dateExamenMax && nouvelleDate >= dateExamenMax) {
                    continue;
                }

                const existe = rows.find(r => Number(r.cycleDay) === Number(jour));

                if (existe) {
                    // On ne met à jour que si l'échéance n'a pas été supprimée juste avant
                    if (!idsASupprimer.includes(existe.id)) {
                        await db.update(echeances)
                            .set({ date: nouvelleDate, stepName: `J${jour}` })
                            .where(eq(echeances.id, existe.id));
                    }
                } else {
                    await db.insert(echeances).values({
                        chapitreId: chap.id,
                        cycleDay: Number(jour),
                        stepName: `J${jour}`,
                        date: nouvelleDate,
                        clerkId: clerkId
                    });
                }
            }
        }

        console.log("✅ Recalcul et filtrage par date d'examen terminés avec succès !");
        return { success: true };
    } catch (err: any) {
        console.error("🔥 ERREUR FATALE:", err);
        return { success: false, message: err.message };
    }
}
