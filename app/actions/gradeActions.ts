"use server";
import { db } from "@/db";
import { individual_notes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function saveNotesAction(chapitreId: string, notes: string) {
  // Ici, on fait un upsert : si les notes existent déjà pour ce chapitre, on update, sinon insert.
  await db.insert(individual_notes)
    .values({ chapitreId, contenu: notes })
    .onConflictDoUpdate({
      target: individual_notes.chapitreId,
      set: { contenu: notes }
    });
}

export async function getMoyenneAction(chapitreId: string) {
  const data = await db.select().from(individual_notes).where(eq(individual_notes.chapitreId, chapitreId));
  if (!data || data.length === 0) return 0;
  
  const notesArray = data[0].contenu.split(' ').map(Number);
  const sum = notesArray.reduce((a, b) => a + b, 0);
  return sum / notesArray.length;
}
