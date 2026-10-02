'use server';

import { db } from '@/db';
import { echeances, individualNotes, chapitres, matieres } from '@/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

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

const DEFAULT_J_SEQUENCE = ['J0', 'J1', 'J2', 'J3', 'J7', 'J14', 'J21', 'J28', 'J45', 'J60', 'J90'];

/**
 * Données graphiques complètes pour UN CHAPITRE
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  try {
    const listEcheances = await db
      .select({
        id: echeances.id,
        stepName: echeances.stepName,
      })
      .from(echeances)
      .where(eq(echeances.chapitreId, chapitreId));

    const echeanceMap = new Map<string, string>();
    listEcheances.forEach(e => {
      if (e.stepName) {
        echeanceMap.set(e.id.toString(), e.stepName);
      }
    });

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
          sql`CAST(TRIM(${individualNotes.chapitreId}) AS TEXT) = ${chapitreId.toString().trim()}`,
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
    let unlinkedIndex = 0;

    rawNotes.forEach(row => {
      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
      }

      let step = '';
      if (row.echeanceId !== null && row.echeanceId !== undefined && row.echeanceId !== '') {
        const foundStep = echeanceMap.get(row.echeanceId.toString());
        if (foundStep) {
          step = foundStep;
        }
      }
      
      if (!step) {
        step = DEFAULT_J_SEQUENCE[unlinkedIndex] || `J${unlinkedIndex * 7}`;
        unlinkedIndex++;
      }

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
 * Données graphiques complètes pour TOUTE UNE MATIÈRE (Exportée pour éviter le crash du build)
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  try {
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
    let unlinkedIndex = 0;

    rawData.forEach(row => {
      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
      }

      if (row.moyenne !== null && row.moyenne !== undefined && row.moyenne !== '') {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          let step = (row.echeanceId !== null && row.stepName) ? row.stepName : '';
          if (!step) {
            step = DEFAULT_J_SEQUENCE[unlinkedIndex] || `J${unlinkedIndex * 7}`;
            unlinkedIndex++;
          }

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