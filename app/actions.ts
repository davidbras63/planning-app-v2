"use server"
import { updateRevisionDate } from "@/logic/recalculerCadencier";
import { checkAccess } from "@/lib/check";
import { auth } from "@clerk/nextjs/server";

export async function actionRecalculer(chapterId: string, cycleDay: number, newDate: string) {
  const { userId } = auth();
  if (!userId || !(await checkAccess(userId))) throw new Error("Accès refusé");
  
  return await updateRevisionDate(chapterId, cycleDay, newDate);
}