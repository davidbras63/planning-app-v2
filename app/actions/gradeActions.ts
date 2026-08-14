"use server";

import { db } from "@/db";
import { individualNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

function calculateAverage(content: string): number {
    if (!content) return 0;
   
    // 1. On remplace les virgules par des points pour que le format décimal soit uniformisé (ex: 16,67 -> 16.67)
    // 2. On découpe uniquement par rapport aux espaces pour garder les nombres entiers ou décimaux intacts
    const notesArray = content
    .toString()
    .replace(/,/g, ".") // Transforme les virgules en points décimaux
    .trim()
    .split(/\s+/) // Découpe uniquement sur les espaces
    .map(n => n.trim())
    .filter(n => n !== "")
    .map(Number)
    .filter((n) => !isNaN(n));

    if (notesArray.length === 0) return 0;

    const sum = notesArray.reduce((a, b) => a + b, 0);
    return Math.round((sum / notesArray.length) * 100) / 100;
}




export async function saveNotesAction(echeanceId: string, chapitreId: string, newNotes: string) {
    if (!echeanceId && !chapitreId) {
        console.error("ERREUR SAVE : echeanceId ou chapitreId manquant !");
        return;
    }

    const { userId } = await auth();
    if (!userId) {
        throw new Error("Utilisateur non authentifié");
    }

    // Recherche de la ligne existante pour CE couple (échéance + chapitre)
    const existing = await db
        .select()
        .from(individualNotes)
        .where(
            and(
                eq(individualNotes.echeanceId, echeanceId),
                eq(individualNotes.chapitreId, chapitreId)
            )
        );

    let finalContent = newNotes;

    

    const cleanContent = finalContent ? finalContent.trim() : "";
	const computedMoyenne = String(calculateAverage(cleanContent) || 0);

    if (existing && existing.length > 0) {
        // Mise à jour si la ligne existe déjà pour ce chapitre et cette échéance
        await db
            .update(individualNotes)
            .set({
                content: finalContent,
                moyenne: computedMoyenne,
            })
            .where(
                and(
                    eq(individualNotes.echeanceId, echeanceId),
                    eq(individualNotes.chapitreId, chapitreId)
                )
            );
    } else {
        // Insertion si c'est une nouvelle entrée
        await db.insert(individualNotes).values({
            clerkId: userId,
            echeanceId: echeanceId,
            chapitreId: chapitreId,
            content: finalContent,
            moyenne: computedMoyenne,
        });
    }
}

export async function getMoyenneAction(echeanceId: string, chapitreId: string) {
    if (!echeanceId || !chapitreId) return 0;

    const data = await db
        .select()
        .from(individualNotes)
        .where(
            and(
                eq(individualNotes.echeanceId, echeanceId),
                eq(individualNotes.chapitreId, chapitreId)
            )
        );

    if (!data || data.length === 0 || !data[0].moyenne) return 0;

    return Number(data[0].moyenne);
}

export async function getCumulativeQcmByChapitreAction(chapitreId: string) {
    if (!chapitreId) return 0;

    const notesList = await db
        .select()
        .from(individualNotes)
        .where(eq(individualNotes.chapitreId, chapitreId));

    if (!notesList || notesList.length === 0) return 0;

    let totalQcm = 0;

    for (const row of notesList) {
        if (!row.content) continue;
        const notesArray = row.content
            .replace(/,/g, ".")
            .split(/[\s+]+/)
            .map(Number)
            .filter((n) => !isNaN(n));

        totalQcm += notesArray.length;
    }

    return totalQcm;
}

export async function getNotesContentAction(echeanceId: string, chapitreId: string) {
    if (!echeanceId || !chapitreId) return "";

    const data = await db
        .select()
        .from(individualNotes)
        .where(
            and(
                eq(individualNotes.echeanceId, echeanceId),
                eq(individualNotes.chapitreId, chapitreId)
            )
        );

    if (!data || data.length === 0 || !data[0].content) return "";

    return data[0].content;
}

export async function getAllUserNotesAction() {
    const { userId } = await auth();
    if (!userId) return {};

    const notes = await db
        .select()
        .from(individualNotes)
        .where(eq(individualNotes.clerkId, userId));

    const result: Record<string, { content: string; moyenne: string }> = {};

    for (const row of notes) {
        const cleanEcheanceId = String(row.echeanceId || '').trim();
        const cleanChapitreId = String(row.chapitreId || '').trim();
        const key = `${cleanEcheanceId}_${cleanChapitreId}`;
       
        result[key] = {
            content: row.content || "",
            moyenne: row.moyenne || "0",
        };
    }

    return result; 
}

