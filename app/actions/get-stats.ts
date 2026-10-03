'use server';

import { db } from '@/db';
import { echeances, individualNotes, chapitres, matieres } from '@/db/schema';
import { eq, and, sql, asc, inArray } from 'drizzle-orm';

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
 * Données graphiques complètes pour UN CHAPITRE (Calcul dynamique du J pour le training)
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  console.log(`[DEBUG CHAPITRE] Début -> chapitreId=${chapitreId}, clerkId=${clerkId}`);
  try {
    // 1. Récupérer toutes les échéances du chapitre pour mapper les ID et trouver la date du J0 de référence
    const listEcheances = await db
      .select({
        id: echeances.id,
        stepName: echeances.stepName,
        date: echeances.date,
        cycleDay: echeances.cycleDay,
      })
      .from(echeances)
      .where(eq(echeances.chapitreId, chapitreId));

    const echeanceMap = new Map<string, string>();
    let j0Date: Date | null = null;

    listEcheances.forEach(e => {
      if (e.stepName) {
        echeanceMap.set(e.id.toString(), e.stepName);
      }
      // Détection du J0 de référence (cycleDay === 0 ou stepName === 'J0')
      if (e.cycleDay === 0 || e.stepName === 'J0') {
        if (e.date) {
          j0Date = new Date(e.date);
        }
      }
    });

    // Récupération large incluant le chapitre OU les notes orphelines/training liées à ce chapitre
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

    console.log(`[DEBUG CHAPITRE] Notes brutes totales (avec training) : ${rawNotes.length}`);

    if (!rawNotes || rawNotes.length === 0) {
      return { success: true, chartData: [], chapitreAverage: 0, totalQcm: 0 };
    }

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};

    rawNotes.forEach((row, index) => {
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

      // Si c'est du training ou non lié : calcul dynamique du J basé sur le J0 du chapitre
      if (!step) {
        if (j0Date && row.createdAt) {
          const trainingDate = new Date(row.createdAt);
          const diffTime = trainingDate.getTime() - j0Date.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          // Si le training est antérieur ou égal à J0, on met J0 ou J, sinon J + diffDays
          step = diffDays >= 0 ? `J${diffDays}` : `J0`;
        } else {
          // Fallback de sécurité si J0 introuvable en base
          step = `J_rec_${row.id}`;
        }
        console.log(`-> Training ID ${row.id} calculé -> Step: ${step}`);
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
 * Données graphiques complètes pour TOUTE UNE MATIÈRE (Calcul dynamique du J unifié)
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  console.log(`[DEBUG MATIERE] Début -> matiereId=${matiereId}, folderId=${folderId}, clerkId=${clerkId}`);
  try {
    // Récupérer tous les chapitres de la matière pour avoir leurs J0 respectifs
    const chapitresList = await db
      .select({ id: chapitres.id })
      .from(chapitres)
      .innerJoin(matieres, eq(chapitres.matiereId, matieres.id))
      .where(and(eq(matieres.id, matiereId), eq(matieres.folderId, folderId)));

    const chapitreIds = chapitresList.map(c => c.id);

    if (chapitreIds.length === 0) {
      return { success: true, chartData: [], matiereAverage: 0, totalQcm: 0 };
    }

    // Récupérer toutes les échéances de ces chapitres pour cartographier les J0 par chapitre_id
    const allEcheances = await db
      .select({
        chapitreId: echeances.chapitreId,
        id: echeances.id,
        stepName: echeances.stepName,
        date: echeances.date,
        cycleDay: echeances.cycleDay,
      })
      .from(echeances)
      .where(inArray(echeances.chapitreId, chapitreIds));

    const echeanceMap = new Map<string, string>();
    const chapitreJ0Map = new Map<number, Date>();

    allEcheances.forEach(e => {
      if (e.stepName) {
        echeanceMap.set(e.id.toString(), e.stepName);
      }
      if (e.chapitreId !== null && (e.cycleDay === 0 || e.stepName === 'J0')) {
        if (e.date) {
          chapitreJ0Map.set(e.chapitreId, new Date(e.date));
        }
      }
    });

    const rawData = await db
      .select({
        chapitreId: individualNotes.chapitreId,
        stepName: echeances.stepName,
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

      // Calcul dynamique du J pour les entraînements au niveau matière
      if (!step) {
        const chapIdNum = row.chapitreId ? Number(row.chapitreId) : null;
        const j0Date = chapIdNum !== null ? chapitreJ0Map.get(chapIdNum) : null;

        if (j0Date && row.createdAt) {
          const trainingDate = new Date(row.createdAt);
          const diffTime = trainingDate.getTime() - j0Date.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          step = diffDays >= 0 ? `J${diffDays}` : `J0`;
        } else {
          step = `J_rec_${row.chapitreId || 0}`;
        }
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