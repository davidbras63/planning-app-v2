'use server';

import { db } from '@/db';
import { subjectAnnals } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getFolderAnalysesData(folderId: number | string) {
  console.log('👉 [DEBUG 1] Appel de getFolderAnalysesData avec folderId:', folderId, '(type:', typeof folderId, ')');

  try {
    const numericFolderId = Number(folderId);
    console.log('👉 [DEBUG 2] folderId converti en number:', numericFolderId);

    const rawData = await db
      .select({
        id: subjectAnnals.id,
        matiereId: subjectAnnals.matiereId,
        notes: subjectAnnals.notes,
        average: subjectAnnals.average,
        revisionDate: subjectAnnals.revisionDate,
        createdAt: subjectAnnals.createdAt,
      })
      .from(subjectAnnals)
      .where(eq(subjectAnnals.folderId, numericFolderId))
      .orderBy(asc(subjectAnnals.revisionDate));

    console.log('👉 [DEBUG 3] rawData récupéré de la bdd (longueur:', rawData?.length, '):', rawData);

    if (!rawData || rawData.length === 0) {
      console.log('⚠️️ [DEBUG 4] rawData est vide ! Aucun enregistrement trouvé pour ce folderId.');
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

    console.log('👉 [DEBUG 5] mapByMatiere construit:', Object.keys(mapByMatiere));

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

    console.log('👉 [DEBUG 6] groupedData final renvoyé au front:', groupedData);

    return {
      success: true,
      data: groupedData,
    };
  } catch (error) {
    console.error('❌ [DEBUG ERREUR] Erreur fatale dans getFolderAnalysesData :', error);
    return { success: false, data: {} };
  }
}