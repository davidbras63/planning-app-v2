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

// Séquence standard des J par défaut si aucune échéance n'est liée
const DEFAULT_J_SEQUENCE = ['J0', 'J1', 'J2', 'J3', 'J7', 'J14', 'J21', 'J28', 'J45', 'J60', 'J90'];

/**
 * Fonction ultra-robuste pour compter les QCM peu importe le format du contenu (JSON, virgules, espaces)
 */
function parseQcmCount(content: string | null): number {
  if (!content) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;

  // 1. Si c'est un tableau ou un objet JSON stocké en string
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.keys(parsed).length;
    }
  } catch (e) {
    // Ce n'est pas du JSON, on continue vers le parsing textuel
  }

  // 2. Sinon, découpage par espaces, virgules ou retours à la ligne
  const items = trimmed.split(/[\s,]+/).filter(Boolean);
  return items.length;
}

/**
 * Données graphiques complètes pour UN CHAPITRE 
 */
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string) {
  try {
    // A. Récupérer les échéances associées à ce chapitre
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

    // B. Récupération robuste de TOUTES les notes du chapitre
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
      // 1. Comptage blindé des QCM
      totalQcm += parseQcmCount(row.content);

      // 2. Détermination ou calcul du J pour le positionnement graphique
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