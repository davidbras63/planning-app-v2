"use server";

import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSettings(userId: string) {
  return await db.query.settings.findMany({
    where: eq(settings.userId, userId),
  });
}

export async function saveSettingsAction(userId: string, data: { key: string, value: string }[]) {
  // On supprime les anciennes valeurs pour ce user pour repartir proprement
  // ou on fait un upsert complexe selon tes préférences.
  // Ici, on purge les clés basées sur ton ancienne logique pour simplifier l'upsert
  await db.delete(settings).where(eq(settings.userId, userId));
  
  // On insère les nouvelles
  await db.insert(settings).values(
    data.map(item => ({ ...item, userId }))
  );
  
  revalidatePath("/protected/settings");
}

export async function recalculerCadencierAction() {
  // Ton code métier ici
  // await ...
  revalidatePath("/protected/settings");
}
