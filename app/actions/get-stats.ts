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

function isTrainingOrUnlinked(echeanceId: unknown): boolean {
  if (echeanceId === null || echeanceId === undefined) return true;
  const str = String(echeanceId).trim().toLowerCase();
  return str === '' || str === 'null' || str === 'undefined' || str === '0';
}

/**
 * Données graphiques complètes pour UN CHAPITRE
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  console.log(`[DEBUG CHAPITRE] Début -> chapitreId=${chapitreId}, clerkId=${clerkId}`);
  try {
    const listEcheances = await db
      .select({
        id: echeances.id,
        stepName: echeances.stepName,
        dueDate: echeances.dueDate,
      })
      .from(echeances)
      .where(eq(echeances.chapitreId, chapitreId));

    const echeanceMap = new Map<string, string>();
    let j0Date: Date | null = null;

    listEcheances.forEach(e => {
      if (e.id) {
        echeanceMap.set(e.id.toString(), e.stepName);
      }
      if (e.stepName === 'J0' && e.dueDate) {
        j0Date = new Date(e.dueDate);
      }
    });

    const rawNotes = await db
      .select({
        id: individualNotes.id,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        echeanceId: individualNotes.echeanceId,
        chapitreId: individualNotes.chapitreId,
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

    if (!j0Date && rawNotes.length > 0) {
      j0Date = new Date(rawNotes[0].createdAt);
    }

    if (!rawNotes || rawNotes.length === 0) {
      return { success: true, chartData: [], chapitreAverage: 0, totalQcm: 0 };
    }

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};

    rawNotes.forEach((row) => {
      const isTraining = isTrainingOrUnlinked(row.echeanceId);

      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
      }

      if (row.moyenne === null || row.moyenne === undefined || row.moyenne === '') return;
      const val = parseFloat(String(row.moyenne));
      if (isNaN(val)) return;

      let step = '';
      if (!isTraining) {
        const foundStep = echeanceMap.get(String(row.echeanceId));
        if (foundStep) step = foundStep;
      }

      // Si c'est du training, on calcule le J par rapport à l'écart de date avec J0
      if (!step) {
        if (j0Date && row.createdAt) {
          const diffDays = Math.round((new Date(row.createdAt).getTime() - new Date(j0Date).getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 0) step = 'J0';
          else if (diffDays === 1) step = 'J1';
          else if (diffDays === 2) step = 'J2';
          else if (diffDays <= 4) step = 'J3';
          else if (diffDays <= 10) step = 'J7';
          else if (diffDays <= 18) step = 'J14';
          else if (diffDays <= 25) step = 'J21';
          else step = `J${diffDays}`;
        } else {
          step = 'J0';
        }
      }

      allNotes.push(val);
      if (!statsByStep[step]) {
        statsByStep[step] = { sum: 0, count: 0 };
      }
      statsByStep[step].sum += val;
      statsByStep[step].count += 1;
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
    console.error("[ERREUR CRITIQUE CHAPITRE] :", error);
    return { success: false, chartData: [], chapitreAverage: 0, totalQcm: 0 };
  }
}

/**
 * Données graphiques complètes pour TOUTE UNE MATIÈRE
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  console.log(`[DEBUG MATIERE] Début -> matiereId=${matiereId}, folderId=${folderId}, clerkId=${clerkId}`);
  try {
    const rawData = await db
      .select({
        stepName: echeances.stepName,
        dueDate: echeances.dueDate,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        echeanceId: individualNotes.echeanceId,
        createdAt: individualNotes.createdAt,
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

    rawData.forEach((row) => {
      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
      }

      if (row.moyenne === null || row.moyenne === undefined || row.moyenne === '') return;
      const val = parseFloat(String(row.moyenne));
      if (isNaN(val)) return;

      allNotes.push(val);
      
      let step = '';
      const isTraining = isTrainingOrUnlinked(row.echeanceId);
      if (!isTraining && row.stepName) {
        step = row.stepName;
      }

      if (!step) {
        // En l'absence d'échéance liée, on positionne par défaut sur J0 ou une estimation standard
        step = 'J0';
      }

      if (!statsByStep[step]) {
        statsByStep[step] = { sum: 0, count: 0 };
      }
      statsByStep[step].sum += val;
      statsByStep[step].count += 1;
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
    console.error("[ERREUR CRITIQUE MATIERE] :", error);
    return { success: false, chartData: [], matiereAverage: 0, totalQcm: 0 };
  }
}