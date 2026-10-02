'use server';

import { db } from '@/db';
import { subjectAnalyses } from '@/db/schema'; // Vérifie que ton import de schéma pointe bien vers ta table
import { eq, and, asc } from 'drizzle-orm';

export async function getSubjectAnalyseGraphData(
  matiereId: number,
  folderId: number,
  clerkId: string
) {
  console.log(
    `[ACTION] getSubjectAnalyseGraphData -> matiereId=${matiereId}, folderId=${folderId}, clerkId=${clerkId}`
  );

  try {
    const rawData = await db
      .select({
        id: subjectAnalyses.id,
        notes: subjectAnalyses.notes,
        average: subjectAnalyses.average,
        revisionDate: subjectAnalyses.revisionDate,
        createdAt: subjectAnalyses.createdAt,
      })
      .from(subjectAnalyses)
      .where(
        and(
          eq(subjectAnalyses.matiereId, matiereId),
          eq(subjectAnalyses.folderId, folderId),
          eq(subjectAnalyses.clerkId, clerkId)
        )
      )
      .orderBy(asc(subjectAnalyses.revisionDate)); // Tri chronologique pour mettre les dates en abscisse

    if (!rawData || rawData.length === 0) {
      return { success: true, chartData: [], matiereAverage: 0, totalQcm: 0 };
    }

    let allAverages: number[] = [];
    let totalQcm = 0;

    const chartData = rawData.map((row) => {
      // Calcul du nombre de QCM à partir de la colonne notes
      let qcmCount = 0;
      if (row.notes) {
        if (Array.isArray(row.notes)) {
          qcmCount = row.notes.length;
        } else if (typeof row.notes === 'string') {
          const parsed = row.notes
            .replace(/[\[\]]/g, '')
            .split(',')
            .filter(Boolean);
          qcmCount = parsed.length;
        }
      }
      totalQcm += qcmCount;

      const avgVal =
        row.average !== null && row.average !== undefined
          ? parseFloat(String(row.average))
          : 0;
      if (!isNaN(avgVal)) {
        allAverages.push(avgVal);
      }

      // Formatage de la date pour l'axe des abscisses (ex: "02/10")
      const rawDate = row.revisionDate || row.createdAt;
      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          })
        : '';

      return {
        date: formattedDate,
        moyenne: Number(avgVal.toFixed(2)),
        qcmCount,
      };
    });

    const matiereAverage =
      allAverages.length > 0
        ? Number(
            (
              allAverages.reduce((a, b) => a + b, 0) / allAverages.length
            ).toFixed(2)
          )
        : 0;

    return {
      success: true,
      chartData,
      matiereAverage,
      totalQcm,
    };
  } catch (error) {
    console.error('Erreur dans getSubjectAnalyseGraphData :', error);
    return { success: false, chartData: [], matiereAverage: 0, totalQcm: 0 };
  }
}