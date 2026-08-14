"use server";

import { db } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { folders, matieres, chapitres, echeances, individualNotes, settings } from "@/db/schema";
import { eq, and, gt, ne } from "drizzle-orm";

export async function getDashboardData(folderId: string) {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const numericFolderId = parseInt(folderId, 10);

  const folderData = await db.query.folders.findFirst({
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
  });
 
  const allFolders = await db.query.folders.findMany({
    where: eq(folders.clerkId, userId ?? ""),
  })
  
  // Récupération des seuils bas de la table settings
  const userSettings = await db.query.settings.findFirst({
    where: eq(settings.clerkId, userId ?? ""),
  });

  let seuilBasTable: number[] = [];
  try {
    const rawSeuil = userSettings?.seuilBasNote;
    if (Array.isArray(rawSeuil)) {
      seuilBasTable = rawSeuil;
    } else if (typeof rawSeuil === 'string') {
      seuilBasTable = JSON.parse(rawSeuil);
    }
  } catch (e) {
    console.error("Erreur de parsing seuilBasNote:", e);
  }

  // On récupère directement les notes individuelles en ciblant la colonne moyenne
  const notesList = await db.query.individualNotes.findMany({
    where: eq(individualNotes.clerkId, userId ?? ""),
})

  const rattrapages = [];
  for (const note of notesList) {
    if (note.isIgnored) continue;  
    
    const chap = await db.query.chapitres.findFirst({
      where: eq(chapitres.id, Number(note.chapitreId)),
    });

    // --- AJOUT : Si le chapitre n'existe pas ou n'appartient pas au dossier actif, on l'ignore ---
    if (!chap) continue;
    
    // On va vérifier si la matière de ce chapitre appartient bien à notre dossier actif
    const matiereAssociee = await db.query.matieres.findFirst({
      where: and(
        eq(matieres.id, Number(chap.matiereId)),
        eq(matieres.folderId, numericFolderId)
      ),
    });

    if (!matiereAssociee) continue; // Si la matière n'est pas dans ce dossier, on passe au suivant !
    // ------------------------------------------------------------------------------------------

    // 1. Déclaration de 'ech' tout en haut de la boucle...
    const ech = note.echeanceId ? await db.query.echeances.findFirst({
      where: eq(echeances.id, Number(note.echeanceId)),
    }) : null;


    // 2. Filtre pour savoir si l'échéance de rattrapage ("R") a déjà été créée
    let dejaReintegre = false;
    if (ech && ech.stepName) {
      const stepRecherche = ech.stepName.includes("R") ? ech.stepName : `${ech.stepName} R`;
      const rExiste = await db.query.echeances.findFirst({
        where: and(
          eq(echeances.chapitreId, Number(note.chapitreId)),
          eq(echeances.stepName, stepRecherche)
        )
      });
      if (rExiste) {
        dejaReintegre = true;
      }
    }

    // 3. Si le "R" existe déjà, on saute cette ligne pour l'effacer du tableau de rattrapage
    if (dejaReintegre) {
      continue;
    }

	

    // La moyenne de la note individuelle
    const moyenneNum = Number(note.moyenne || 0);
   
    // Récupération du J via l'échéance liée (ech est parfaitement défini ici)
    const indexCadencier = (ech?.cycleDay !== null && ech?.cycleDay !== undefined) ? Number(ech.cycleDay) : 0;

    let seuilBasActif = null;
    if (seuilBasTable[indexCadencier] !== undefined) {
      seuilBasActif = Number(seuilBasTable[indexCadencier]);
    }

    // Comparaison de la moyenne de la note avec le seuil bas du J correspondant
    if (seuilBasActif !== null && moyenneNum > 0 && moyenneNum < seuilBasActif) {
      rattrapages.push({
        id: note.id,
        echeanceId: note.echeanceId,
        chapitreId: note.chapitreId,
        moyenne: note.moyenne,
        titre: chap?.titre || "Chapitre inconnu",
        cycleDay: indexCadencier,
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
    // 1. Trouver les chapitres de la matière
    const chaps = await db.select().from(chapitres).where(eq(chapitres.matiereId, numericId));
    for (const chap of chaps) {
      // Supprimer les notes et échéances de chaque chapitre
      await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(chap.id)));
      await db.delete(echeances).where(eq(echeances.chapitreId, String(chap.id)));
    }
    // 2. Supprimer les chapitres
    await db.delete(chapitres).where(eq(chapitres.matiereId, numericId));
    // 3. Supprimer la matière
    await db.delete(matieres).where(eq(matieres.id, numericId));
  } 
  
  else if (table === 'chapitres') {
    // 1. Supprimer les notes et échéances liées au chapitre
    await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(numericId)));
    await db.delete(echeances).where(eq(echeances.chapitreId, String(numericId)));
    // 2. Supprimer le chapitre
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

  // 1. Récupérer toutes les matières du dossier
  const mats = await db.select().from(matieres).where(eq(matieres.folderId, numericFolderId));
  
  for (const mat of mats) {
    // Pour chaque matière, on supprime ses chapitres
    const chaps = await db.select().from(chapitres).where(eq(chapitres.matiereId, mat.id));
    for (const chap of chaps) {
      // Supprimer les notes et échéances de chaque chapitre
      await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(chap.id)));
      await db.delete(echeances).where(eq(echeances.chapitreId, String(chap.id)));
    }
    // Supprimer les chapitres de la matière
    await db.delete(chapitres).where(eq(chapitres.matiereId, mat.id));
    // Supprimer la matière
    await db.delete(matieres).where(eq(matieres.id, mat.id));
  }

  // 2. Supprimer les settings liés à ce dossier
  await db.delete(settings).where(
    and(
      eq(settings.folderId, numericFolderId),
      eq(settings.clerkId, userId)
    )
  );

  // 3. Enfin, supprimer le dossier en toute sécurité
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