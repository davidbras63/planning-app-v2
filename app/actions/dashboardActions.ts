"use server";

import { db } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { folders, matieres, chapitres, echeances, individualNotes, settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getDashboardData(folderId: string) {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const numericFolderId = parseInt(folderId, 10);

        // 1. On charge tout en une seule fois (zéro requête SQL en cascade dans la boucle)
        const [folderData, allFolders, userSettings, notesList, allEcheancesUser, allChapitresUser, allMatieresUser] = await Promise.all([
            db.query.folders.findFirst({
                where: eq(folders.id, numericFolderId),
                with: {
                    matieres: {
                        with: {
                            chapitres: {
                                with: {
                                    echeances: true,
                                },
                            },
                        },
                    },
                },
            }),
            db.query.folders.findMany({
                where: eq(folders.clerkId, userId ?? ""),
            }),
            db.query.settings.findFirst({
                where: and(
                    eq(settings.clerkId, userId ?? ""),
                    eq(settings.folderId, Number(folderId))
                ),
            }),
            db.query.individualNotes.findMany({
                where: eq(individualNotes.clerkId, userId ?? ""),
            }),
            db.query.echeances.findMany(),
            db.query.chapitres.findMany(),
            db.query.matieres.findMany()
        ]);

        if (!folderData) return null;

        // Parsing des seuils bas et du cadencier
        let seuilBasTable: number[] = [];
        let cadencierTable: number[] = [];

        try {
            const rawSeuil = userSettings?.seuilBasNote;
            if (Array.isArray(rawSeuil)) {
                seuilBasTable = rawSeuil;
            } else if (typeof rawSeuil === 'string') {
                seuilBasTable = JSON.parse(rawSeuil);
            }

            const rawCadencier = userSettings?.cadencier;
            if (Array.isArray(rawCadencier)) {
                cadencierTable = rawCadencier;
            } else if (typeof rawCadencier === 'string') {
                cadencierTable = JSON.parse(rawCadencier);
            }
        } catch (e) {
            console.error("Erreur de parsing des settings (seuil/cadencier):", e);
        }

        // 2. Indexation en mémoire pour retrouver instantanément les données sans refaire de requêtes
        const chapitreMap = new Map(allChapitresUser.map(c => [c.id, c]));
        const matiereMap = new Map(allMatieresUser.map(m => [m.id, m]));
        const echeanceMap = new Map(allEcheancesUser.map(e => [e.id, e]));

        const existingRSteps = new Set<string>();
        for (const ech of allEcheancesUser) {
            if (ech.chapitreId && ech.stepName) {
                existingRSteps.add(`${ech.chapitreId}_${ech.stepName}`);
            }
        }

        const rattrapages = [];

        // 3. Boucle de traitement 100% en mémoire (ultra rapide, zéro latence)
        for (const note of notesList) {
            if (note.isIgnored) continue;  
            
            const chapIdNum = Number(note.chapitreId);
            const chap = chapitreMap.get(chapIdNum);
            if (!chap) continue;
            
            const matiereAssociee = matiereMap.get(Number(chap.matiereId));
            if (!matiereAssociee || matiereAssociee.folderId !== numericFolderId) continue;

            const ech = note.echeanceId ? echeanceMap.get(Number(note.echeanceId)) : null;

            let dejaReintegre = false;
            if (ech && ech.stepName) {
                const stepRecherche = ech.stepName.includes("R") ? ech.stepName : `${ech.stepName} R`;
                if (existingRSteps.has(`${chapIdNum}_${stepRecherche}`)) {
                    dejaReintegre = true;
                }
            }

            if (dejaReintegre) {
                continue;
            }

            const moyenneNum = Number(note.moyenne || 0);
            const cycleDayValue = (ech?.cycleDay !== null && ech?.cycleDay !== undefined) ? Number(ech.cycleDay) : 0;
            const cadencierIndex = cadencierTable.indexOf(cycleDayValue);

            let seuilBasActif = null;
            if (cadencierIndex !== -1 && seuilBasTable[cadencierIndex] !== undefined) {
                seuilBasActif = Number(seuilBasTable[cadencierIndex]);
            }

            if (seuilBasActif !== null && moyenneNum > 0 && moyenneNum < seuilBasActif) {
                rattrapages.push({
                    id: note.id,
                    echeanceId: note.echeanceId,
                    chapitreId: note.chapitreId,
                    moyenne: note.moyenne,
                    titre: chap?.titre || "Chapitre inconnu",
                    cycleDay: cycleDayValue,
                    date: ech?.date || null,
                    stepName: ech?.stepName || null,
                });
            }
        }

        return {
            folder: folderData,
            folderList: allFolders,
            rattrapages: rattrapages,
        };
    } catch (error) {
        console.error("Erreur critique dans getDashboardData:", error);
        return null;
    }
}

// SUPPRESSION EN CASCADE PROPRE
export async function deleteDashboardItem(table: 'matieres' | 'chapitres' | 'echeances', id: string | number) {
  const numericId = Number(id);

  if (table === 'matieres') {
    const chaps = await db.select().from(chapitres).where(eq(chapitres.matiereId, numericId));
    for (const chap of chaps) {
      await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(chap.id)));
      await db.delete(echeances).where(eq(echeances.chapitreId, String(chap.id)));
    }
    await db.delete(chapitres).where(eq(chapitres.matiereId, numericId));
    await db.delete(matieres).where(eq(matieres.id, numericId));
  } 
  
  else if (table === 'chapitres') {
    await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(numericId)));
    await db.delete(echeances).where(eq(echeances.chapitreId, String(numericId)));
    await db.delete(chapitres).where(eq(chapitres.id, numericId));
  } 
  
  else if (table === 'echeances') {
    await db.delete(echeances).where(eq(echeances.id, numericId));
  }

  return { success: true };
}

// SUPPRESSION D'UN DOSSIER EN CASCADE COMPLET
export async function deleteFolderAction(folderId: string | number) {
  const numericFolderId = Number(folderId);
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");

  const mats = await db.select().from(matieres).where(eq(matieres.folderId, numericFolderId));
  
  for (const mat of mats) {
    const chaps = await db.select().from(chapitres).where(eq(chapitres.matiereId, mat.id));
    for (const chap of chaps) {
      await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(chap.id)));
      await db.delete(echeances).where(eq(echeances.chapitreId, String(chap.id)));
    }
    await db.delete(chapitres).where(eq(chapitres.matiereId, mat.id));
    await db.delete(matieres).where(eq(matieres.id, mat.id));
  }

  await db.delete(settings).where(
    and(
      eq(settings.folderId, numericFolderId),
      eq(settings.clerkId, userId)
    )
  );

  await db.delete(folders).where(eq(folders.id, numericFolderId));

  return { success: true };
}

export async function actionIgnorerRattrapage(noteId: string) {
  try {
    await db.update(individualNotes)
      .set({ isIgnored: true })
      .where(eq(individualNotes.id, Number(noteId)));

    revalidatePath("/protected/dashboard/1");
    return { success: true };
  } catch (err) {
    console.error("Erreur ignorance rattrapage :", err);
    return { success: false, message: "Erreur serveur." };
  }
}