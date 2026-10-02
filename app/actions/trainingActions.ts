'use server';

import { db } from '@/db';
import { matieres, chapitres, subjectAnnals, individualNotes } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, gte, lte } from 'drizzle-orm';

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

// Récupère les saisies d'annales du jour pour pré-remplir la modale depuis la table dédiée subjectAnnals
export async function actionGetTodayAnnales(folderId: string) {
    const { userId } = await auth();
    if (!userId || !folderId) return { success: false, data: {} };

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const records = await db
            .select()
            .from(subjectAnnals)
            .where(
                and(
                    eq(subjectAnnals.clerkId, userId),
                    eq(subjectAnnals.folderId, Number(folderId)),
                    gte(subjectAnnals.createdAt, startOfDay),
                    lte(subjectAnnals.createdAt, endOfDay)
                )
            );

        const mappedData: { [key: string]: string } = {};
        records.forEach(r => {
            if (r.matiereId && r.notes) {
                mappedData[String(r.matiereId)] = Array.isArray(r.notes) ? r.notes.join(' ') : '';
            }
        });

        return { success: true, data: mappedData };
    } catch (error) {
        console.error("Erreur actionGetTodayAnnales:", error);
        return { success: false, data: {} };
    }
}

// Récupère les saisies de chapitres du jour pour pré-remplir la modale
export async function actionGetTodayChapitres() {
    const { userId } = await auth();
    if (!userId) return { success: false, data: {} };

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const records = await db
            .select()
            .from(individualNotes)
            .where(
                and(
                    eq(individualNotes.clerkId, userId),
                    eq(individualNotes.isDirectTraining, true),
                    gte(individualNotes.createdAt, startOfDay),
                    lte(individualNotes.createdAt, endOfDay)
                )
            );

        const mappedData: { [key: string]: string } = {};
        records.forEach(r => {
            if (r.chapitreId && r.content) {
                mappedData[r.chapitreId] = r.content;
            }
        });

        return { success: true, data: mappedData };
    } catch (error) {
        console.error("Erreur actionGetTodayChapitres:", error);
        return { success: false, data: {} };
    }
}

// Fonction utilitaire pour parser la chaîne brute et compter les QCM / notes
function parseNotesString(rawInput: string): { notes: number[]; average: number; qcmCount: number } {
    if (!rawInput || typeof rawInput !== 'string') return { notes: [], average: 0, qcmCount: 0 };

    const parts = rawInput.trim().split(/\s+/).filter(Boolean);
    const notes: number[] = [];
    let totalScore = 0;
    let totalMax = 0;

    for (const part of parts) {
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

    if (notes.length === 0 || totalMax === 0) return { notes: [], average: 0, qcmCount: 0 };
    const average = Number(((totalScore / totalMax) * 20).toFixed(2));
    return { notes, average, qcmCount: parts.length };
}

// Enregistrement unifié avec Upsert par jour (Annales et Chapitres avec calcul exact du J pour le training)
export async function actionSaveTraining(data: {
    type: 'annales' | 'chapitre';
    folderId: string;
    matiereId: string;
    chapitreId?: string | number | null;
    rawNotesInput: string;
}) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    try {
        const { notes, average, qcmCount } = parseNotesString(data.rawNotesInput);

        if (notes.length === 0) {
            throw new Error("Aucune note valide n'a été saisie.");
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        if (data.type === 'annales') {
            const numFolderId = data.folderId ? Number(data.folderId) : null;
            const numMatiereId = Number(data.matiereId);

            const existing = await db
                .select()
                .from(subjectAnnals)
                .where(
                    and(
                        eq(subjectAnnals.clerkId, userId),
                        eq(subjectAnnals.matiereId, numMatiereId),
                        gte(subjectAnnals.createdAt, startOfDay),
                        lte(subjectAnnals.createdAt, endOfDay)
                    )
                );

            if (existing.length > 0) {
                await db
                    .update(subjectAnnals)
                    .set({
                        notes: notes,
                        average: average.toFixed(2),
                        revisionDate: new Date().toISOString(),
                    })
                    .where(eq(subjectAnnals.id, existing[0].id));
            } else {
                await db.insert(subjectAnnals).values({
                    clerkId: userId,
                    folderId: numFolderId,
                    matiereId: numMatiereId,
                    notes: notes,
                    average: average.toFixed(2),
                    revisionDate: new Date().toISOString(),
                });
            }
        } else {
            if (!data.chapitreId) throw new Error("Chapitre manquant");
            const strChapitreId = String(data.chapitreId);

            // Récupération de la date de création / J0 du chapitre pour calculer le J exact du training
            const chapitreRecord = await db
                .select()
                .from(chapitres)
                .where(eq(chapitres.id, Number(strChapitreId)))
                .limit(1);

            let calculatedStepName = "J0";
            if (chapitreRecord.length > 0 && chapitreRecord[0].createdAt) {
                const chapitreDate = new Date(chapitreRecord[0].createdAt);
                chapitreDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - chapitreDate.getTime();
                const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                calculatedStepName = `J${diffDays}`;
            }

            const existingChap = await db
                .select()
                .from(individualNotes)
                .where(
                    and(
                        eq(individualNotes.clerkId, userId),
                        eq(individualNotes.chapitreId, strChapitreId),
                        eq(individualNotes.isDirectTraining, true),
                        gte(individualNotes.createdAt, startOfDay),
                        lte(individualNotes.createdAt, endOfDay)
                    )
                );

            if (existingChap.length > 0) {
                await db
                    .update(individualNotes)
                    .set({
                        moyenne: average.toFixed(2),
                        content: data.rawNotesInput,
                        stepName: calculatedStepName,
                    })
                    .where(eq(individualNotes.id, existingChap[0].id));
            } else {
                await db.insert(individualNotes).values({
                    clerkId: userId,
                    chapitreId: strChapitreId,
                    moyenne: average.toFixed(2),
                    content: data.rawNotesInput,
                    isDirectTraining: true,
                    stepName: calculatedStepName,
                });
            }
        }

        return { success: true, average, qcmCount };
    } catch (error) {
        console.error("Erreur actionSaveTraining:", error);
        return { success: false, error: String(error) };
    }
}