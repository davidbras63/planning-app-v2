'use strict';

import { db } from '@/db';
import { matieres, chapitres, subjectAnnals, individualNotes } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

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

// Fonction utilitaire pour parser la chaîne brute (espaces et fractions)
function parseNotesString(rawInput: string): { notes: number[]; average: number } {
    if (!rawInput || typeof rawInput !== 'string') return { notes: [], average: 0 };

    const parts = rawInput.trim().split(/\s+/);
    const notes: number[] = [];
    let totalScore = 0;
    let totalMax = 0;

    for (const part of parts) {
        if (!part) continue;
        if (part.includes('/')) {
            const [valStr, maxStr] = part.split('/');
            const val = parseFloat(valStr);
            const max = parseFloat(maxStr);
            if (!isNaN(val) && !isNaN(max) && max > 0) {
                const normalized = (val / max) * 20;
                notes.push(Number(normalized.toFixed(2)));
                totalScore += normalized;
                totalMax += 20;
            }
        } else {
            const val = parseFloat(part);
            if (!isNaN(val)) {
                notes.push(val);
                totalScore += val;
                totalMax += 20;
            }
        }
    }

    if (notes.length === 0 || totalMax === 0) return { notes: [], average: 0 };
    const average = Number(((totalScore / totalMax) * 20).toFixed(2));
    return { notes, average };
}

// Enregistrement unifié avec conservation de la chaîne brute et des notes individuelles
export async function actionSaveTraining(data: {
    type: 'annales' | 'chapitre';
    folderId: string;
    matiereId: string;
    chapitreId?: string | number | null;
    rawNotesInput: string; // La chaîne brute saisie (ex: "15 25/30")
}) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    try {
        const { notes, average } = parseNotesString(data.rawNotesInput);

        if (notes.length === 0) {
            throw new Error("Aucune note valide n'a été saisie.");
        }

        if (data.type === 'annales') {
            await db.insert(subjectAnnals).values({
                clerkId: userId,
                folderId: data.folderId ? Number(data.folderId) : null,
                matiereId: Number(data.matiereId),
                notes: notes, // Tableau JSON brut pour alimenter les graphiques et le .length (QCM)
                average: average.toFixed(2), // Moyenne pour le positionnement J-day
                revisionDate: new Date().toISOString(),
            });
        } else {
            if (!data.chapitreId) throw new Error("Chapitre manquant");
            await db.insert(individualNotes).values({
                clerkId: userId,
                chapitreId: String(data.chapitreId),
                moyenne: average.toFixed(2),
                content: data.rawNotesInput, // Stocke la chaîne brute saisie
            });
        }

        return { success: true, average };
    } catch (error) {
        console.error("Erreur actionSaveTraining:", error);
        return { success: false, error: String(error) };
    }
}