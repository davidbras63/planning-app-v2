import { NextResponse } from 'next/server';
import { db } from "@/db";
import { settings, matieres, chapitres, echeances } from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const url = new URL(request.url);
        const folderId = url.searchParams.get('folderId');

        let query = db.select().from(settings).where(eq(settings.clerkId, userId));
        const userSettings = await query;
        
        if (folderId) {
            const found = userSettings.find(s => String(s.folderId) === String(folderId));
            return NextResponse.json(found || userSettings[0] || null);
        }

        return NextResponse.json(userSettings[0] || null);
    } catch (error) {
        console.error("Erreur API settings GET:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const url = new URL(request.url);
        const folderIdParam = url.searchParams.get('folderId');

        const body = await request.json();
        // On récupère le folderId soit du body, soit de l'URL
        const folderId = body.folderId ?? folderIdParam;
        const { cadencier } = body;

        if (!Array.isArray(cadencier)) {
            return NextResponse.json({ error: "Cadencier invalide" }, { status: 400 });
        }

        console.log(`🚀 API POST Settings - folderId: ${folderId}, cadencier:`, cadencier);

        // 1. Mise à jour des settings pour ce dossier précis
        if (folderId) {
            await db.update(settings)
                .set({ cadencier: cadencier })
                .where(eq(settings.folderId, folderId));
        } else {
            await db.update(settings)
                .set({ cadencier: cadencier })
                .where(eq(settings.clerkId, userId));
        }

        // 2. Récupérer UNIQUEMENT les matières de ce folderId exact
        const folderIdStr = String(folderId);
        const folderIdNum = Number(folderId);

        const allMatieres = folderId 
            ? await db.select({ id: matieres.id }).from(matieres).where(
                or(
                    eq(matieres.folderId, folderIdStr),
                    !isNaN(folderIdNum) ? eq(matieres.folderId, folderIdNum) : undefined
                )
              )
            : await db.select({ id: matieres.id }).from(matieres).where(eq(matieres.clerkId, userId));

        const matiereIds = allMatieres.map(m => m.id);
        console.log("📂 IDs des matières ciblées pour ce dossier :", matiereIds);

        if (matiereIds.length > 0) {
            // 3. Récupérer TOUS les chapitres de ces matières
            const allChapitres = await db.select()
                .from(chapitres)
                .where(inArray(chapitres.matiereId, matiereIds));

            for (const chap of allChapitres) {
                const rows = await db.select().from(echeances).where(eq(echeances.chapitreId, chap.id));
                
                const j0 = rows.find(r => r.stepName === 'J0');
                if (!j0) continue;

                const dateBase = new Date(j0.date);

                // 4. SUPPRESSION : On vire les anciennes échéances absentes du nouveau cadencier (sauf J0)
                const idsASupprimer = rows
                    .filter(r => r.cycleDay !== 0 && !cadencier.includes(r.cycleDay))
                    .map(r => r.id);

                if (idsASupprimer.length > 0) {
                    console.log(`🗑️ Suppression de ${idsASupprimer.length} échéances pour le chapitre ${chap.id}`);
                    await db.delete(echeances).where(inArray(echeances.id, idsASupprimer));
                }

                // 5. MISE À JOUR / INSERTION : Application du nouveau cadencier
                for (const jour of cadencier) {
                    const nouvelleDate = new Date(dateBase);
                    nouvelleDate.setDate(nouvelleDate.getDate() + jour);

                    const existe = rows.find(r => r.cycleDay === jour);

                    if (existe) {
                        await db.update(echeances)
                            .set({ date: nouvelleDate, stepName: `J${jour}` })
                            .where(eq(echeances.id, existe.id));
                    } else {
                        await db.insert(echeances).values({
                            chapitreId: chap.id,
                            cycleDay: jour,
                            stepName: `J${jour}`,
                            date: nouvelleDate,
                            clerkId: userId
                        });
                    }
                }
            }
        }

        console.log("✅ Recalcul et nettoyage ciblés terminés !");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("🔥 Erreur API settings POST:", error);
        return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
    }
}
