'use server';

import { db } from '@/db';
import { subjectAnalyses } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server'; // ou ton helper d'auth serveur

export async function getFolderAnalysesData(folderId: number) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return { success: false, data: {} };

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
      .where(
        and(
          eq(subjectAnalyses.folderId, folderId),
          eq(subjectAnalyses.clerkId, clerkId)
        )
      )
      .orderBy(asc(subjectAnalyses.revisionDate));

    // On groupe les résultats par matiereId dans un objet
    const groupedData: Record<string, { chartData: any[]; average: number; totalQcm: number }> = {};

    // Regrouper par matière
    const mapByMatiere = rawData.reduce((acc: any, row) => {
      if (!acc[row.matiereId]) acc[row.matiereId] = [];
      acc[row.matiereId].push(row);
      return acc;
    }, {});

    for (const [matiereId, rows] of Object.entries(mapByMatiere) as [string, any[]][]) {
      let allAverages: number[] = [];
      let totalQcm = 0;

      const chartData = rows.map((row) => {
        let qcmCount = 0;
        if (row.notes) {
          if (Array.isArray(row.notes)) {
            qcmCount = row.notes.length;
          } else if (typeof row.notes === 'string') {
            const parsed = row.notes.replace(/[\[\]]/g, '').split(',').filter(Boolean);
            qcmCount = parsed.length;
          }
        }
        totalQcm += qcmCount;

        const avgVal = row.average !== null && row.average !== undefined ? parseFloat(String(row.average)) : 0;
        if (!isNaN(avgVal)) allAverages.push(avgVal);

        const rawDate = row.revisionDate || row.createdAt;
        const formattedDate = rawDate
          ? new Date(rawDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : '';

        return {
          date: formattedDate,
          moyenne: Number(avgVal.toFixed(2)),
          qcmCount,
        };
      });

      const matiereAverage = allAverages.length > 0
        ? Number((allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2))
        : 0;

      groupedData[matiereId] = {
        chartData,
        average: matiereAverage,
        totalQcm,
      };
    }

    return { success: true, data: groupedData };
  } catch (error) {
    console.error('Erreur getFolderAnalysesData :', error);
    return { success: false, data: {} };
  }
}