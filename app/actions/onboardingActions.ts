'use server';

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { folders, matieres, settings, chapitres } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) return { hasFolders: false, hasMatieres: false, hasSettings: false, hasChapitres: false, hasTestedPlanning: false };

  // 1. Vérifier les dossiers
  const userFolders = await db.select().from(folders).where(eq(folders.clerkId, userId));
  const hasFolders = userFolders.length > 0;

  let hasMatieres = false;
  let hasSettings = false;
  let hasChapitres = false;

  if (hasFolders) {
    // On récupère les IDs des dossiers pour vérifier les relations
    const folderIds = userFolders.map(f => f.id);

    // 2. Vérifier les matières liées aux dossiers
    const userMatieres = await db.select().from(matieres);
    hasMatieres = userMatieres.some(m => m.folderId && folderIds.includes(m.folderId));

    // 3. Vérifier les settings liés aux dossiers
    const userSettings = await db.select().from(settings);
    hasSettings = userSettings.some(s => folderIds.includes(s.folderId));

    // 4. Vérifier les chapitres liés aux matières
    const matiereIds = userMatieres.map(m => m.id);
    if (matiereIds.length > 0) {
      const userChapitres = await db.select().from(chapitres);
      hasChapitres = userChapitres.some(c => c.matiereId && matiereIds.includes(c.matiereId));
    }
  }

  // Pour le test du planning (étape 5), on peut stocker ça en localStorage ou dans une table dédiée, 
  // ici on laisse un check localStorage géré côté client ou on l'adapte selon ton besoin.
  return {
    hasFolders,
    hasMatieres,
    hasSettings,
    hasChapitres,
  };
}
