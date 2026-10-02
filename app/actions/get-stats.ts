'use server';

import { db } from '@/db';
import { echeances, individualNotes, chapitres, matieres, subjectAnnals } from '@/db/schema';
import { eq, and, sql, isNull, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// Tri dynamique et universel pour n'importe quel J (J3, J7, J7R, J9, J14, J30, J60...)
function sortEcheances(a: string, b: string) {
  const stepA = String(a || "");
  const stepB = String(b || "");

  const numA = parseInt(stepA.replace(/\D/g, "")) || 0;
  const numB = parseInt(stepB.replace(/\D/g, "")) || 0;

  if (numA !== numB) {
    return numA - numB;
  }

  const hasRA = stepA.includes("R");
  const hasRB = stepB.includes("R");

  if (!hasRA && hasRB) return -1;
  if (hasRA && !hasRB) return 1;

  return 0;
}

/**
 * 2. Compte le nombre total de notes (QCM) pour un chapitre
 */
export async function getChapitreQcmCount(chapitreId: number, clerkId: string, isDirectTraining: boolean = false) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId),
          isDirectTraining 
            ? eq(individualNotes.isDirectTraining, true) 
            : or(eq(individualNotes.isDirectTraining, false), isNull(individualNotes.isDirectTraining))
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
export async function getMatiereQcmCount(matiereId: number, clerkId: string, isDirectTraining: boolean = false) {
  try {
    const rows = await db
      .select({
        content: individualNotes.content,
      })
      .from(individualNotes)
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .where(
        and(
          eq(chapitres.matiereId, Number(matiereId)),
          eq(individualNotes.clerkId, clerkId),
          isDirectTraining 
            ? eq(individualNotes.isDirectTraining, true) 
            : or(eq(individualNotes.isDirectTraining, false), isNull(individualNotes.isDirectTraining))
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
export async function getChapitreGraphDataComplete(chapitreId: number, clerkId: string, isDirectTraining: boolean = false) {
  try {
    // Récupérer d'abord la date de création du chapitre pour un calcul propre du J en entraînement direct
    const chapRecord = await db
      .select({ createdAt: chapitres.createdAt })
      .from(chapitres)
      .where(eq(chapitres.id, Number(chapitreId)))
      .limit(1);

    const chapCreatedAt = chapRecord.length > 0 && chapRecord[0].createdAt ? new Date(chapRecord[0].createdAt).getTime() : null;

    const rawData = await db
      .select({
        stepName: echeances.stepName,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        isDirectTraining: individualNotes.isDirectTraining,
        createdAt: individualNotes.createdAt,
      })
      .from(individualNotes)
      .leftJoin(echeances, eq(sql`CAST(${individualNotes.echeanceId} AS INTEGER)`, echeances.id))
      .where(
        and(
          eq(individualNotes.chapitreId, chapitreId.toString()),
          eq(individualNotes.clerkId, clerkId),
          isDirectTraining 
            ? eq(individualNotes.isDirectTraining, true) 
            : or(eq(individualNotes.isDirectTraining, false), isNull(individualNotes.isDirectTraining))
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

      if (row.moyenne !== null && row.moyenne !== undefined) {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          
          let step: string | null = null;
          if (row.isDirectTraining) {
            if (chapCreatedAt && row.createdAt) {
              const noteTime = new Date(row.createdAt).getTime();
              const diffDays = Math.round((noteTime - chapCreatedAt) / (1000 * 60 * 60 * 24));
              step = `J${Math.max(0, diffDays)}`;
            } else {
              step = 'J0';
            }
          } else {
            step = row.stepName;
          }

          const finalStep = step || 'Inconnu';
          if (!statsByStep[finalStep]) {
            statsByStep[finalStep] = { sum: 0, count: 0 };
          }
          statsByStep[finalStep].sum += val;
          statsByStep[finalStep].count += 1;
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
      chapitreAverage,
      totalQcm,
    };
  } catch (error) {
    console.error("Erreur graph chapitre :", error);
    return { success: false, chartData: [], chapitreAverage: 0, totalQcm: 0 };
  }
}

/**
 * 5. Données graphiques complètes pour TOUTE UNE MATIÈRE
 */
export async function getMatiereGraphDataComplete(matiereId: number, folderId: number, clerkId: string, isDirectTraining: boolean = false) {
  try {
    const rawData = await db
      .select({
        stepName: echeances.stepName,
        moyenne: individualNotes.moyenne,
        content: individualNotes.content,
        isDirectTraining: individualNotes.isDirectTraining,
        createdAt: individualNotes.createdAt,
        chapitreCreatedAt: chapitres.createdAt,
      })
      .from(individualNotes)
      .leftJoin(echeances, eq(sql`CAST(${individualNotes.echeanceId} AS INTEGER)`, echeances.id))
      .innerJoin(chapitres, eq(sql`CAST(${individualNotes.chapitreId} AS INTEGER)`, chapitres.id))
      .innerJoin(matieres, eq(chapitres.matiereId, matieres.id))
      .where(
        and(
          eq(matieres.id, Number(matiereId)),
          eq(matieres.folderId, Number(folderId)),
          eq(individualNotes.clerkId, clerkId),
          isDirectTraining 
            ? eq(individualNotes.isDirectTraining, true) 
            : or(eq(individualNotes.isDirectTraining, false), isNull(individualNotes.isDirectTraining))
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

      if (row.moyenne !== null && row.moyenne !== undefined) {
        const val = parseFloat(row.moyenne);
        if (!isNaN(val)) {
          allNotes.push(val);
          
          let step: string | null = null;
          if (row.isDirectTraining) {
            if (row.chapitreCreatedAt && row.createdAt) {
              const chapTime = new Date(row.chapitreCreatedAt).getTime();
              const noteTime = new Date(row.createdAt).getTime();
              const diffDays = Math.round((noteTime - chapTime) / (1000 * 60 * 60 * 24));
              step = `J${Math.max(0, diffDays)}`;
            } else {
              step = 'J0';
            }
          } else {
            step = row.stepName;
          }

          const finalStep = step || 'Inconnu';
          if (!statsByStep[finalStep]) {
            statsByStep[finalStep] = { sum: 0, count: 0 };
          }
          statsByStep[finalStep].sum += val;
          statsByStep[finalStep].count += 1;
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

/**
 * 6. Données graphiques et analytiques pour la vue "anal" (basée sur subjectAnnals)
 */
export async function getSubjectAnalGraphData(matiereId: number) {
  const { userId } = await auth();
  if (!userId) return { success: false, chartData: [], subjectAverage: 0, totalQcm: 0 };

  try {
    const rawData = await db
      .select({
        createdAt: subjectAnnals.createdAt,
        average: subjectAnnals.average,
        notes: subjectAnnals.notes,
      })
      .from(subjectAnnals)
      .where(
        and(
          eq(subjectAnnals.matiereId, Number(matiereId)),
          eq(subjectAnnals.clerkId, userId)
        )
      )
      .orderBy(subjectAnnals.createdAt);

    let allNotes: number[] = [];
    let totalQcm = 0;
    let runningSum = 0;
    let runningCount = 0;

    const chartData = rawData.map((row) => {
      if (row.notes) {
        if (Array.isArray(row.notes)) {
          totalQcm += row.notes.length;
        } else if (typeof row.notes === 'string') {
          const parsedNotes = (row.notes as string).trim().split(/\s+/).filter(Boolean);
          totalQcm += parsedNotes.length;
        }
      }

      const val = row.average !== null && row.average !== undefined ? parseFloat(row.average) : 0;
      if (!isNaN(val) && row.average !== null) {
        allNotes.push(val);
        runningSum += val;
        runningCount += 1;
      }

      const runningAverage = runningCount > 0 ? runningSum / runningCount : 0;

      const abscissaDate = row.createdAt 
        ? new Date(row.createdAt).toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          }) 
        : 'Inconnue';

      return {
        date: abscissaDate,
        moyenne: Number(val.toFixed(2)),
        average: Number(runningAverage.toFixed(2)),
        totalQcmCumul: totalQcm
      };
    });

    const subjectAverage = allNotes.length > 0 
      ? Number((allNotes.reduce((a, b) => a + b, 0) / allNotes.length).toFixed(2)) 
      : 0;

    return {
      success: true,
      chartData,
      subjectAverage,
      totalQcm,
    };
  } catch (error) {
    console.error("Erreur graph subject annals :", error);
    return { success: false, chartData: [], subjectAverage: 0, totalQcm: 0 };
  }
}