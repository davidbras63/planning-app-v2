'use server';

import { db } from "@/db"; // Instance Drizzle
import { matieres, chapitres, links } from "@/db/schema"; // Import depuis ton schéma réel
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { folders } from "@/db/schema";

// 1. Action pour créer une matière (remplace l'ancienne "createFolder")
export async function actionCreateMatiere(name: string, folderId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Non autorisé");

  await db.insert(matieres).values({ 
    nom: name, 
    folderId: folderId // <-- On rattache bien la matière au dossier actif
  });
  
  revalidatePath("/protected/dashboard");
  return { success: true };
}


// 2. Action pour récupérer les matières (remplace l'ancienne "getFolders")
export async function actionGetMatieres(folderId: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Non autorisé");

    return await db.select({ id: matieres.id, name: matieres.nom })
        .from(matieres)
        .where(eq(matieres.folderId, folderId));
}

// 3. Action pour créer un chapitre (remplace l'ancienne "createSubject")
export async function actionCreateChapitre(title: string, matiereId: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Non autorisé");

    await db.insert(chapitres).values({ titre: title, matiereId: matiereId });
    revalidatePath("/");
    return { success: true };
}

// 4. Action pour sauvegarder un lien
export async function actionSaveLink(title: string, url: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Non autorisé");

    await db.insert(links).values({ clerkId: clerkId, label: title, url: url });
    revalidatePath("/");
    return { success: true };
}

// 5. Action pour récupérer les liens
export async function actionGetLinks() {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Non autorisé");
    
    return await db.select().from(links).where(eq(links.clerkId, clerkId));
}

// 6. Action pour créer un dossier (ou matière)
export async function actionCreateFolder(name: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Non autorisé");

  await db.insert(folders).values({ name: name, clerkId: clerkId });
  revalidatePath("/");
  return { success: true };
}

export async function actionGetFolders() {
  const { userId } = await auth();
  if (!userId) return [];
  
  return await db.query.folders.findMany({
    where: eq(folders.clerkId, userId),
  });
}