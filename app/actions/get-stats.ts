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

function isTrainingOrUnlinked(echeanceId: unknown): boolean {
  if (echeanceId === null || echeanceId === undefined) return true;
  const str = String(echeanceId).trim().toLowerCase();
  return str === '' || str === 'null' || str === 'undefined' || str === '0';
}

/**
 * Données graphiques complètes pour UN CHAPITRE (Ultra-instrumenté)
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  console.log(`[DEBUG CHAPITRE] Début pour chapitreId=${chapitreId}, clerkId=${clerkId}`);
  try {
    const listEcheances = await db
      .select({
        id: echeances.id,
        stepName: echeances.stepName,
      })
      .from(echeances)
      .where(eq(echeances.chapitreId, chapitreId));

    console.log(`[DEBUG CHAPITRE] Échéances trouvées en DB :`, listEcheances);

    const echeanceMap = new Map<string, string>();
    listEcheances.forEach(e => {
      if (e.stepName) {
        echeanceMap.set(e.id.toString(), e.stepName);
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

    console.log(`[DEBUG CHAPITRE] Notes brutes récupérées (${rawNotes.length} lignes) :`, rawNotes);

    if (!rawNotes || rawNotes.length === 0) {
      console.log(`[DEBUG CHAPITRE] Aucune note trouvée pour ce chapitre.`);
      return { success: true, chartData: [], chapitreAverage: 0, totalQcm: 0 };
    }

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};
    let unlinkedIndex = 0;

    rawNotes.forEach((row, index) => {
      console.log(`\n--- [ROW ${index}] ID: ${row.id} ---`);
      console.log(`  content:`, row.content);
      console.log(`  moyenne stockée:`, row.moyenne, `(type: ${typeof row.moyenne})`);
      console.log(`  echeanceId:`, row.echeanceId, `(isTraining: ${isTrainingOrUnlinked(row.echeanceId)})`);

      // 1. Comptage des QCM
      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
        console.log(`  -> QCM comptés: ${items.length} (Total cumulé QCM: ${totalQcm})`);
      }

      // 2. Récupération de la moyenne stockée
      let rowMoyenne = 0;
      let hasValidMoyenne = false;

      if (row.moyenne !== null && row.moyenne !== undefined && row.moyenne !== '') {
        const val = parseFloat(String(row.moyenne));
        if (!isNaN(val)) {
          rowMoyenne = val;
          hasValidMoyenne = true;
          console.log(`  -> Moyenne valide extraite: ${rowMoyenne}`);
        } else {
          console.log(`  -> ÉCHEC parseFloat sur moyenne:`, row.moyenne);
        }
      } else {
        console.log(`  -> Champ moyenne vide ou null !`);
      }

      if (!hasValidMoyenne) {
        console.log(`  -> Ligne ignorée car pas de moyenne valide.`);
        return;
      }

      // 3. Détermination du J (step)
      let step = '';
      const isTraining = isTrainingOrUnlinked(row.echeanceId);
      
      if (!isTraining) {
        const foundStep = echeanceMap.get(row.echeanceId!.toString());
        if (foundStep) {
          step = foundStep;
          console.log(`  -> Échéance liée trouvée, step = ${step}`);
        } else {
          console.log(`  -> echeanceId ${row.echeanceId} non trouvé dans la map d'échéances.`);
        }
      }

      if (!step) {
        step = DEFAULT_J_SEQUENCE[unlinkedIndex] || `J${unlinkedIndex * 7}`;
        console.log(`  -> C'est du training / non lié. Attribution du J séquentiel: ${step} (index: ${unlinkedIndex})`);
        unlinkedIndex++;
      }

      // 4. Intégration stats
      allNotes.push(rowMoyenne);
      if (!statsByStep[step]) {
        statsByStep[step] = { sum: 0, count: 0 };
      }
      statsByStep[step].sum += rowMoyenne;
      statsByStep[step].count += 1;
      console.log(`  -> Ajouté au step ${step}. Total pour ce step:`, statsByStep[step]);
    });

    console.log(`[DEBUG CHAPITRE] statsByStep final :`, statsByStep);
    console.log(`[DEBUG CHAPITRE] allNotes global :`, allNotes);

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

    console.log(`[DEBUG CHAPITRE] chartData final :`, chartData);

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
 * Données graphiques complètes pour TOUTE UNE MATIÈRE (Ultra-instrumenté)
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string) {
  console.log(`[DEBUG MATIERE] Début pour matiereId=${matiereId}, folderId=${folderId}, clerkId=${clerkId}`);
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

    console.log(`[DEBUG MATIERE] Lignes brutes récupérées (${rawData.length}) :`, rawData);

    let allNotes: number[] = [];
    let totalQcm = 0;
    const statsByStep: Record<string, { sum: number; count: number }> = {};
    let unlinkedIndex = 0;

    rawData.forEach((row, index) => {
      if (row.content) {
        const items = row.content.trim().split(/[\s,]+/).filter(Boolean);
        totalQcm += items.length;
      }

      if (row.moyenne !== null && row.moyenne !== undefined && row.moyenne !== '') {
        const val = parseFloat(String(row.moyenne));
        if (!isNaN(val)) {
          allNotes.push(val);
          
          let step = '';
          const isTraining = isTrainingOrUnlinked(row.echeanceId);
          if (!isTraining && row.stepName) {
            step = row.stepName;
          }

          if (!step) {
            step = DEFAULT_J_SEQUENCE[unlinkedIndex] || `J${unlinkedIndex * 7}`;
            unlinkedIndex++;
          }

          if (!statsByStep[step]) {
            statsByStep[step] = { sum: 0, count: 0 };
          }
          statsByStep[step].sum += val;
          statsByStep[step].count += 1;
        } else {
          console.log(`[DEBUG MATIERE] Ligne ${index} : échec parse moyenne`, row.moyenne);
        }
      } else {
        console.log(`[DEBUG MATIERE] Ligne ${index} : moyenne vide`);
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

    console.log(`[DEBUG MATIERE] chartData final :`, chartData);

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