'use server';

import { db } from '@/db';
import { echeances, individualNotes, chapitres, matieres } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// 1. Tri personnalisé pour respecter l'ordre des J et des rattrapages (J3 -> J3R -> J7...)
function sortEcheances(a: string, b: string) {
  const order: Record<string, number> = {
    'J0': 0, 'J1': 1, 'J2': 2, 'J3': 3, 'J3R': 4,
    'J7': 5, 'J7R': 6, 'J14': 7, 'J14R': 8, 'J21': 9, 'J21R': 10
  };
  return (order[a] ?? 99) - (order[b] ?? 99);
}

/**
 * 2. Compte le nombre total de notes (QCM) pour un chapitre
 */
export async function getChapitreQcmCount(chapitreId: number, clerkId: string) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let totalQcm = 0;
    rows.forEach((row) => {
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }
    });

    return { success: true, totalQcm };
  } catch (error) {
    console.error("Erreur comptage QCM chapitre :", error);
    return { success: false, totalQcm: 0 };
  }
}

/**
 * 3. Compte le nombre total de notes (QCM) pour toute une matière
 */
export async function getMatiereQcmCount(matiereId: number, clerkId: string) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .where(
        and(
          eq(chapitres.matiereId, matiereId),
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let totalQcm = 0;
    rows.forEach((row) => {
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }
    });

    return { success: true, totalQcm };
  } catch (error) {
    console.error("Erreur comptage QCM matière :", error);
    return { success: false, totalQcm: 0 };
  }
}

/**
 * 4. Données graphiques complètes pour UN CHAPITRE (Courbe J, Average, QCM)
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  try {
    const rawData = await db
      .select({
        stepName: echeances.stepName,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
      })
      .from(individualNotes)
      .innerJoin(echeances, eq(individualNotes.echeanceId, sql`CAST(${echeances.id} AS TEXT)`.inlineParams()))
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};

    rawData.forEach(row => {
      // Calcul du total QCM via le contenu de la note
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }

      // Traitement des moyennes pour le graphique
      if (row.moyenne) {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          const step = row.stepName || 'Inconnu';
          if (!statsByStep[step]) {
            statsByStep[step] = { sum: 0, count: 0 };
          }
          statsByStep[step].sum += val;
          statsByStep[step].count += 1;
        }
      }
    });

    const chapitreAverage = allNotes.length > 0 
      ? Number((allNotes.reduce((a, b) => a + b, 0) / allNotes.length).toFixed(2)) 
      : 0;

    // Construction du tableau pour le graphique avec l'average cumulé au fil du temps
    let runningSum = 0;
    let runningCount = 0;

    const sortedSteps = Object.keys(statsByStep).sort(sortEcheances);
    
    const chartData = sortedSteps.map(step => {
      const stepAvg = statsByStep[step].sum / statsByStep[step].count;
      
      // Calcul de l'average cumulé (tendance globale jusqu'à cette étape)
      runningSum += statsByStep[step].sum;
      runningCount += statsByStep[step].count;
      const runningAverage = runningCount > 0 ? runningSum / runningCount : 0;

      return {
        step,
        moyenne: Number(stepAvg.toFixed(2)),
        average: Number(runningAverage.toFixed(2)) // La fameuse courbe average par-dessus
      };
    });

    return {
      success: true,
      chartData,
      chapitreAverage,
      totalQcm,
    };
  } catch (error) {
    console.error("Erreur graph chapitre :", error);
    return { success: false, chartData: [], chapitreAverage: 0, totalQcm: 0 };
  }
}

/**
 * 5. Données graphiques complètes pour TOUTE UNE MATIÈRE (Filtrée par folderId via les tables)
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  try {
    const rawData = await db
      .select({
        stepName: echeances.stepName,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
      })
      .from(individualNotes)
      .innerJoin(echeances, eq(individualNotes.echeanceId, sql`CAST(${echeances.id} AS TEXT)`.inlineParams()))
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .innerJoin(matieres, eq(chapitres.matiereId, matieres.id))
      .where(
        and(
          eq(matieres.id, matiereId),
          eq(matieres.folderId, folderId), // Sécurisation par le folderId de l'URL
          eq(individualNotes.clerkId, clerkId)
        )
      );

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};

    rawData.forEach(row => {
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }

      if (row.moyenne) {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          const step = row.stepName || 'Inconnu';
          if (!statsByStep[step]) {
            statsByStep[step] = { sum: 0, count: 0 };
          }
          statsByStep[step].sum += val;
          statsByStep[step].count += 1;
        }
      }
    });

    const matiereAverage = allNotes.length > 0 
      ? Number((allNotes.reduce((a, b) => a + b, 0) / allNotes.length).toFixed(2)) 
      : 0;

    let runningSum = 0;
    let runningCount = 0;
    const sortedSteps = Object.keys(statsByStep).sort(sortEcheances);

    const chartData = sortedSteps.map(step => {
      const stepAvg = statsByStep[step].sum / statsByStep[step].count;
      
      runningSum += statsByStep[step].sum;
      runningCount += statsByStep[step].count;
      const runningAverage = runningCount > 0 ? runningSum / runningCount : 0;

      return {
        step,
        moyenne: Number(stepAvg.toFixed(2)),
        average: Number(runningAverage.toFixed(2))
      };
    });

    return {
      success: true,
      chartData,
      matiereAverage,
      totalQcm,
    };
  } catch (error) {
    console.error("Erreur graph matière :", error);
    return { success: false, chartData: [], matiereAverage: 0, totalQcm: 0 };
  }
}
