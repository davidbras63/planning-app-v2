import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matieres } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderIdParam = searchParams.get('folderId');

    let allMatieres;
    if (folderIdParam) {
      const folderId = Number(folderIdParam);
      allMatieres = await db.select().from(matieres).where(eq(matieres.folderId, folderId));
    } else {
      allMatieres = await db.select().from(matieres);
    }

    console.log("Données brutes des matières :", allMatieres);
    return NextResponse.json(allMatieres);
  } catch (error) {
    console.error("Erreur API-matieres:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des matières" }, { status: 500 });
  }
}
