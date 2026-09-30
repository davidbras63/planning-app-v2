'use server';

import { db } from '@/db';
import { matieres, chapitres, subjectAnnals, individualNotes } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';

export async function actionGetMatieresByFolder(folderId: string) {
    const { userId } = await auth();
    if (!userId || !folderId) return { success: false, matieres: [] };

    try {
        const result = await db
            .select()
            .from(matieres)
            .where(
                eq(matieres.folderId, Number(folderId))
            );

        const matieresWithChapitres = await Promise.all(
            result.map(async (m) => {
                const chaps = await db
                    .select()
                    .from(chapitres)
                    .where(eq(chapitres.matiereId, Number(m.id)));
                return {
                    ...m,
                    chapitres: chaps
                };
            })
        );

        return { success: true, matieres: matieresWithChapitres };
    } catch (error) {
        console.error("Erreur actionGetMatieresByFolder:", error);
        return { success: false, matieres: [] };
    }
}

// 2. Enregistrer l'entraînement (Mode Annales ou Mode Chapitre)
export async function actionSaveTraining(data: {
    type: 'annales' | 'chapitre';
    folderId: string;
    matiereId: string;
    chapitreId?: string | number | null;
    title?: string;
    score: number | '';
    maxScore: number | '';
}) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    try {
        const scoreVal = Number(data.score);
        const maxVal = Number(data.maxScore) || 20;

        // Sécurité division par zéro
        if (maxVal === 0) throw new Error("Le score maximum ne peut pas être 0");

        // Normalisation de la note sur 20
        const converted = (scoreVal / maxVal) * 20;
        const finalScoreFormatted = Number(converted.toFixed(2));

        if (data.type === 'annales') {
            await db.insert(subjectAnnals).values({
                clerkId: userId,
                folderId: data.folderId ? Number(data.folderId) : null,
                matiereId: Number(data.matiereId),
                notes: [finalScoreFormatted],
                average: finalScoreFormatted.toFixed(2),
                revisionDate: new Date().toISOString(),
            });
        } else {
            if (!data.chapitreId) throw new Error("Chapitre manquant");
            await db.insert(individualNotes).values({
                clerkId: userId,
                chapitreId: String(data.chapitreId),
                moyenne: finalScoreFormatted.toFixed(2),
                content: `Entraînement: ${data.score}/${data.maxScore}`,
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Erreur actionSaveTraining:", error);
        return { success: false, error: String(error) };
    }
}