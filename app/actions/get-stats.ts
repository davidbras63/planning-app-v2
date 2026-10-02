'use server';

import { db } from '@/db';
import { echeances, individualNotes, chapitres, matieres } from '@/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

// Tri personnalisé pour respecter l'ordre des J et des rattrapages
function sortEcheances(a: string, b: string) {
  const order: Record<string, number> = {
    'J0': 0, 'J1': 1, 'J2': 2, 'J3': 3, 'J3R': 4,
    'J7': 5, 'J7R': 6, 'J14': 7, 'J14R': 8, 'J21': 9, 'J21R': 10
  };
  const numA = parseInt(a.replace(/\D/g, "")) || 99;
  const numB = parseInt(b.replace(/\D/g, "")) || 99;
  if (numA !== numB) return numA - numB;
  return (order[a] ?? 99) - (order[b] ?? 99);
}

/**
 * 1. Données graphiques complètes pour UN CHAPITRE 
 * (Récupère tout : planning + entraînement direct où echeanceId est NULL)
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  try {
    // A. Récupérer les échéances associées à ce chapitre (echeances.chapitreId est un integer)
    const listEcheances = await db
      .select({
        id: echeances.id,
        stepName: echeances.stepName,
      })
      .from(echeances)
      .where(eq(echeances.chapitreId, chapitreId));

    // Map pour faire correspondre l'ID de l'échéance (converti en string) à son stepName
    const echeanceMap = new Map<string, string>();
    listEcheances.forEach(e => {
      echeanceMap.set(e.id.toString(), e.stepName || 'J0');
    });

    // B. Récupérer TOUTES les notes du chapitre (individualNotes.chapitreId est un text)
    const rawNotes = await db
      .select({
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        echeanceId: individualNotes.echeanceId,
        createdAt: individualNotes.createdAt,
      })
      .from(individualNotes)
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId)
        )
      )
      .orderBy(asc(individualNotes.createdAt));

    if (!rawNotes || rawNotes.length === 0) {
      return { success: true, chartData: [], chapitreAverage: 0, totalQcm: 0 };
    }

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};

    rawNotes.forEach(row => {
      // 1. Comptage des QCM (chaque élément séparé par des espaces dans content)
      if (row.content) {
        const notes = row.content.trim().split(/\s+/).filter(Boolean);
        totalQcm += notes.length;
      }

      // 2. Détermination de l'étape (step)
      let step = 'Entraînement';
      if (row.echeanceId !== null && row.echeanceId !== undefined && row.echeanceId !== '') {
        const foundStep = echeanceMap.get(row.echeanceId.toString());
        if (foundStep) {
          step = foundStep;
        }
      }

      // 3. Traitement de la moyenne
      if (row.moyenne !== null && row.moyenne !== undefined && row.moyenne !== '') {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);

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

    let runningSum = 0;
    let runningCount = 0;
    const sortedSteps = Object.keys(statsByStep).sort(sortEcheances);

    const chartData = sortedSteps.map(step => {
      const stepData = statsByStep[step];
      const stepAvg = stepData.count > 0 ? stepData.sum / stepData.count : 0;
      
      runningSum += stepData.sum;
      runningCount += stepData.count;
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
      chapitreAverage,
      totalQcm,
    };
  } catch (error) {
    console.error("Erreur graph chapitre :", error);
    return { success: false, chartData: [], chapitreAverage: 0, totalQcm: 0 };
  }
}

/**
 * 2. Données graphiques complètes pour TOUTE UNE MATIÈRE
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  try {
    // Récupération via jointures propres en castant le chapitreId text en integer pour matcher chapitres.id
    const rawData = await db
      .select({
        stepName: echeances.stepName,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        echeanceId: individualNotes.echeanceId,
      })
      .from(individualNotes)
      .leftJoin(echeances, eq(sql`CAST(${individualNotes.echeanceId} AS INTEGER)`, echeances.id))
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .innerJoin(matieres, eq(chapitres.matiereId, matieres.id))
      .where(
        and(
          eq(matieres.id, matiereId),
          eq(matieres.folderId, folderId),
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

      if (row.moyenne !== null && row.moyenne !== undefined && row.moyenne !== '') {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          const step = (row.echeanceId !== null && row.stepName) ? row.stepName : 'Entraînement';
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
      const dataStep = statsByStep[step];
      const stepAvg = dataStep.count > 0 ? dataStep.sum / dataStep.count : 0;
      
      runningSum += dataStep.sum;
      runningCount += dataStep.count;
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