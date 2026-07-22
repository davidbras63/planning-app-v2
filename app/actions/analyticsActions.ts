"use server";

import { db } from "@/lib/db";
import { chapitres } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function getAnalyticsData(userId: string) {
  // On récupère les chapitres et on "inclut" (with) les notes associées
  const data = await db.query.chapitres.findMany({
    where: eq(chapitres.userId, userId),
    with: {
      notes: true, // 'notes' correspond au nom que tu as donné dans le bloc relations du schema
    },
  });

  return data;
}
