"use server"
import { updateRevisionDate } from "@/app/actions/recalculerCadencier";
import { checkAccess } from "@/app/actions/checkAccess";
import { auth } from "@clerk/nextjs/server";

export async function actionRecalculer(chapterId: string, cycleDay: number, newDate: string) {
  const { clerkId } = await auth();
  if (!clerkId || !(await checkAccess(clerkId))) throw new Error("Accès refusé");
  
  return await updateRevisionDate(chapterId, cycleDay, newDate);
/* } */