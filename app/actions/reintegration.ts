'use server';

import { db } from "@/db";
import { echeances, settings, individualNotes, chapitres } from "@/db/schema";
import { eq, count, sql, and } from "drizzle-orm";
import { revalidatePath } from 'next/cache';

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export async function actionTenterReintegration(
    clerkId: string,
    chapitreId: string,
    frontEndEcheanceId: string,
    nextDueDate: any,
    examDateInput: any
) {
    const chapIdNum = Number(chapitreId);
    const echIdNum = frontEndEcheanceId ? Number(frontEndEcheanceId) : null;

    try {
        const userSettings = (await db.select().from(settings).where(eq(settings.clerkId, clerkId)).limit(1))[0];
        const maxCoursParJour = userSettings?.maxDays ?? 5;

        let stepNameOriginal = "GO R";
        let originalCycleDay = 0;

        const echeanceOrigine = echIdNum ? await db.query.echeances.findFirst({
            where: eq(echeances.id, echIdNum)
        }) : null;

        if (echeanceOrigine) {
            if (echeanceOrigine.stepName) {
                stepNameOriginal = echeanceOrigine.stepName.includes("R") 
                    ? echeanceOrigine.stepName 
                    : `${echeanceOrigine.stepName} R`;
            }
            if (echeanceOrigine.cycleDay !== undefined && echeanceOrigine.cycleDay !== null) {
                originalCycleDay = echeanceOrigine.cycleDay;
            }
        }

        // Recherche de l'échéance suivante pour interdire la veille directe
        let dateSuivanteMax: Date | null = null;
        if (echeanceOrigine && echeanceOrigine.date) {
            const prochaineEcheance = await db.query.echeances.findFirst({
                where: and(
                    eq(echeances.chapitreId, chapIdNum),
                    sql`${echeances.date} > ${echeanceOrigine.date}`
                ),
                orderBy: [echeances.date]
            });
            if (prochaineEcheance && prochaineEcheance.date) {
                dateSuivanteMax = new Date(prochaineEcheance.date);
                dateSuivanteMax.setDate(dateSuivanteMax.getDate() - 1); // Ex: si J3 le mercredi, maxLimit est le mardi (exclu)
            }
        }

        let examLimitDate: Date | null = examDateInput ? new Date(examDateInput) : null;
        if (!examLimitDate || isNaN(examLimitDate.getTime())) {
            const chap = await db.query.chapitres.findFirst({ where: eq(chapitres.id, chapIdNum) });
            if (chap?.dateExamen) examLimitDate = new Date(chap.dateExamen);
        }

        if (!examLimitDate) return { success: false, message: "Date examen manquante." };
        examLimitDate.setDate(examLimitDate.getDate() - 3);
        const maxLimitStr = formatDate(examLimitDate);

        let minDateTest = new Date(); 
        if (echeanceOrigine && echeanceOrigine.date) {
            const dateOrigine = new Date(echeanceOrigine.date);
            dateOrigine.setDate(dateOrigine.getDate() + 1);
            if (dateOrigine > minDateTest) {
                minDateTest = dateOrigine;
            }
        }

        let dateTest = new Date(minDateTest);
        let dateTestStr = formatDate(dateTest);

        while (dateTestStr <= maxLimitStr) {
            // BLOQUAGE STRICT DE LA VEILLE : si la date test atteint ou dépasse la limite avant le cours suivant, on stoppe
            if (dateSuivanteMax && dateTest >= dateSuivanteMax) {
                break; 
            }

            const dejaProgramme = await db.query.echeances.findFirst({
                where: and(
                    eq(echeances.chapitreId, chapIdNum),
                    sql`${echeances.date} >= ${dateTestStr + ' 00:00:00'}::timestamp AND ${echeances.date} <= ${dateTestStr + ' 23:59:59'}::timestamp`
                )
            });

            const charge = await db.select({ count: count() }).from(echeances).where(
                sql`${echeances.date} >= ${dateTestStr + ' 00:00:00'}::timestamp AND ${echeances.date} <= ${dateTestStr + ' 23:59:59'}::timestamp`
            );

            if (!dejaProgramme && (charge[0]?.count ?? 0) < maxCoursParJour) {
                await db.insert(echeances).values({
                    chapitreId: chapIdNum,
                    date: sql`${dateTestStr}::date`,
                    stepName: stepNameOriginal,
                    cycleDay: originalCycleDay,
                });

                revalidatePath("/protected/dashboard/1");
                revalidatePath("/protected/planning");

                return { success: true, data: String(dateTestStr) };
            }

            dateTest.setDate(dateTest.getDate() + 1);
            dateTestStr = formatDate(dateTest);
        }

        // Si aucune place n'est trouvée (ou si bloqué par la règle de la veille), on renvoie le message pour déclencher ton calendrier de forçage
        return { success: false, message: "Aucune place trouvée. Voulez-vous forcer la réintégration ?" };
    } catch (err) {
        console.error("Erreur réintégration :", err);
        return { success: false, message: "Erreur serveur." };
    }
}

export async function actionForcerReintegration(chapitreId: string, frontEndEcheanceId: string, forcedDate: Date) {
    try {
        const chapIdNum = Number(chapitreId);
        const echIdNum = frontEndEcheanceId ? Number(frontEndEcheanceId) : null;

        let stepNameOriginal = "GO R";
        let originalCycleDay = 0;

        if (echIdNum) {
            const echeanceOrigine = await db.query.echeances.findFirst({
                where: eq(echeances.id, echIdNum)
            });

            if (echeanceOrigine) {
                if (echeanceOrigine.stepName) {
                    stepNameOriginal = echeanceOrigine.stepName.includes("R") 
                        ? echeanceOrigine.stepName 
                        : `${echeanceOrigine.stepName} R`;
                }
                if (echeanceOrigine.cycleDay !== undefined && echeanceOrigine.cycleDay !== null) {
                    originalCycleDay = echeanceOrigine.cycleDay;
                }
            }
        }

        const forcedDateStr = formatDate(new Date(forcedDate));

        await db.insert(echeances).values({
            chapitreId: chapIdNum,
            date: sql`${forcedDateStr}::date`,
            stepName: stepNameOriginal,
            cycleDay: originalCycleDay,
        });

        revalidatePath("/protected/dashboard/1");
        revalidatePath("/protected/planning");

        return { success: true, data: String(forcedDateStr) };
    } catch (err) {
        console.error("Erreur force réintégration :", err);
        return { success: false, message: "Erreur serveur lors du forçage." };
    }
}

export async function actionIgnorerRattrapage(id: string) {
    "use server";
    try {
        await db.update(individualNotes)
            .set({ isIgnored: true })
            .where(eq(individualNotes.id, Number(id)));

        return { success: true };
    } catch (error) {
        console.error("Erreur serveur :", error);
        return { success: false, message: "Erreur serveur" };
    }
}