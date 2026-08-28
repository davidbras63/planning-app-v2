"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Récupération des paramètres filtrés par utilisateur ET par dossier
export async function getSettings(clerkId: string, folderId: string) {
  try {
    if (!clerkId || !folderId) return null;

    const folderIdNum = Number(folderId);

    // 1. On cherche la ligne existante pour ce user ET ce folderId précis
    const result = await db.select().from(settings).where(
      and(
        eq(settings.clerkId, clerkId),
        eq(settings.folderId, folderIdNum) // On cherche avec le folderId
      )
    ).limit(1);

    // 2. Si on trouve, on retourne la ligne
    if (result.length > 0) {
      return result[0];
    }

    // 3. Si on ne trouve RIEN, on crée la ligne par défaut avec le folderId
    const defaultSettings = {
      clerkId,
      folderId: folderIdNum, // On force l'insertion du folderId ici !
      cadencier: [0, 1, 3, 7, 14, 30, 60, 90],
      maxCoursParJour: 5,
      seuilBasNote: [10, 10, 10, 10, 10, 10, 10, 10],
      seuilHautNote: [20, 20, 20, 20, 20, 20, 20, 20],
      updatedAt: new Date().toISOString(),
    };

    await db.insert(settings).values(defaultSettings);
    
    return defaultSettings;

  } catch (error) {
    console.error("Erreur lors de la récupération ou création des paramètres:", error);
    return null;
  }
}

// Sauvegarde ou mise à jour liée à l'utilisateur ET au dossier
export async function saveSettingsAction(
  clerkId: string,
  folderId: any,
  data: {
    cadencier: any;
    maxCoursParJour: number;
    seuilBasNote: any;
    seuilHautNote: any;
  }
) {
  try {
    if (!clerkId || !folderId) throw new Error("Clerk ID ou Folder ID manquant");

    const folderIdNum = Number(folderId); // <--- Conversion propre en nombre

    const existing = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.clerkId, clerkId),
          eq(settings.folderId, folderIdNum) // <--- Utilisation du nombre
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db.update(settings)
        .set({
          cadencier: data.cadencier,
          maxCoursParJour: data.maxCoursParJour,
          seuilBasNote: data.seuilBasNote,
          seuilHautNote: data.seuilHautNote,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(settings.clerkId, clerkId),
            eq(settings.folderId, folderIdNum) // <--- Ici aussi
          )
        );
    } else {
      await db.insert(settings).values({
        clerkId,
        folderId: folderIdNum, // <--- Et bien sûr ici pour remplir la colonne !
        cadencier: data.cadencier,
        maxCoursParJour: data.maxCoursParJour,
        seuilBasNote: data.seuilBasNote,
        seuilHautNote: data.seuilHautNote,
      });
    }

    revalidatePath(`/protected/settings/${folderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("ERREUR DANS saveSettingsAction :", error);
    throw new Error(error.message || "Erreur serveur lors de la sauvegarde");
  }
}

