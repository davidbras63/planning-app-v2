'use server';

import { db } from '@/db';
import { subjectAnalyses } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getFolderAnalysesData(folderId: number) {
  try {
    const rawData = await db
      .select({
        id: subjectAnalyses.id,
        matiereId: subjectAnalyses.matiereId,
        notes: subjectAnalyses.notes,
        average: subjectAnalyses.average,
        revisionDate: subjectAnalyses.revisionDate,
        createdAt: subjectAnalyses.createdAt,
      })
      .from(subjectAnalyses)
      .where(eq(subjectAnalyses.folderId, folderId))
      .orderBy(asc(subjectAnalyses.revisionDate));

    if (!rawData || rawData.length === 0) {
      return { success: true, data: {} };
    }

    const mapByMatiere: Record<string, any[]> = {};
    for (const row of rawData) {
      const mId = String(row.matiereId);
      if (!mapByMatiere[mId]) {
        mapByMatiere[mId] = [];
      }
      mapByMatiere[mId].push(row);
    }

    const groupedData: Record<string, { chartData: any[]; average: number; totalQcm: number }> = {};

    for (const [matiereId, rows] of Object.entries(mapByMatiere)) {
      let allAverages: number[] = [];
      let totalQcm = 0;

      const chartData = rows.map((row) => {
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

      groupedData[matiereId] = {
        chartData,
        average: matiereAverage,
        totalQcm,
      };
    }

    return {
      success: true,
      data: groupedData,
    };
  } catch (error) {
    console.error('Erreur dans getFolderAnalysesData :', error);
    return { success: false, data: {} };
  }
}