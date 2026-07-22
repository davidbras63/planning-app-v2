'use server';

import { db } from "@/db"; // Instance Drizzle
import { matieres, chapitres, links } from "@/db/schema"; // Import depuis ton schéma réel
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// 1. Action pour créer une matière (remplace l'ancienne "createFolder")
export async function actionCreateMatiere(name: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    await db.insert(matieres).values({ nom: name, userId: userId });
    revalidatePath("/");
    return { success: true };
}

// 2. Action pour récupérer les matières (remplace l'ancienne "getFolders")
export async function actionGetMatieres() {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    return await db.select({ id: matieres.id, name: matieres.nom })
        .from(matieres)
        .where(eq(matieres.userId, userId));
}

// 3. Action pour créer un chapitre (remplace l'ancienne "createSubject")
export async function actionCreateChapitre(title: string, matiereId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");

    await db.insert(chapitres).values({ titre: title, matiereId: matiereId });
    revalidatePath("/");
    return { success: true };
}

// 4. Action pour sauvegarder un lien
export async function actionSaveLink(title: string, url: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");
    
    // Assure-toi que ta table 'links' possède bien les colonnes userId, title et url
    await db.insert(links).values({ userId: userId, title: title, url: url });
    revalidatePath("/");
    return { success: true };
}

// 5. Action pour récupérer les liens
export async function actionGetLinks() {
    const { userId } = await auth();
    if (!userId) throw new Error("Non autorisé");
    
    return await db.select().from(links).where(eq(links.userId, userId));
}
