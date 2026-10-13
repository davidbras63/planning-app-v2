"use server";

import { db } from "@/db";
import { settings, links, echeances, users } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function ensureUserInitialized(clerkId: string, folderId?: number) {
    if (!clerkId) return;

    try {
        // 1. GESTION DE L'AFFILIATION
        // On récupère le cookie 'affiliate_ref' posé par le middleware sur le navigateur
        const cookieStore = await cookies();
        const affiliateCode = cookieStore.get('affiliate_ref')?.value;

        if (affiliateCode) {
            // On vérifie d'abord si l'utilisateur n'a pas déjà un parrain enregistré
            const userRecord = await db.select({ referredBy: users.referredBy })
                .from(users)
                .where(eq(users.clerkId, clerkId));

            // Si le champ referredBy est encore vide (null ou non défini), on l'enregistre dans Neon
            if (userRecord.length > 0 && !userRecord[0].referredBy) {
                await db.update(users)
                    .set({ referredBy: affiliateCode })
                    .where(eq(users.clerkId, clerkId));
                
                console.log(`Parrain ${affiliateCode} attribué avec succès à ${clerkId}`);
            }
        }

        // 2. GESTION DES SETTINGS (Ton code existant)
        // Si on a un folderId, on vérifie si des settings existent DÉJÀ pour ce dossier précis
        if (folderId) {
            const existing = await db.select().from(settings).where(eq(settings.folderId, folderId));
            
            // S'il n'y a rien pour ce dossier, on injecte les valeurs par défaut une seule fois
            if (existing.length === 0) {
                await db.insert(settings).values({
                    clerkId: clerkId,
                    folderId: folderId,
                    cadencier: [0, 1, 3, 7, 14, 30, 60, 90],
                    seuilBasNote: [10, 10, 10, 10, 10, 10, 10, 10],
                    seuilHautNote: [20, 20, 20, 20, 20, 20, 20, 20],
                    maxCoursParJour: 5,
                });
            }
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation : ", error);
    }
}

export async function toggleEcheanceCompleted(id: number, completed: boolean) {
    try {
        await db
            .update(echeances)
            .set({ completed: completed })
            .where(eq(echeances.id, id));
            
        revalidatePath("/protected/planning");
        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'échéance :", error);
        return { success: false, error };
    }
}