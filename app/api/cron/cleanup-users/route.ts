import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, folders, matieres, chapitres, individualNotes, echeances, settings, links } from '@/db/schema';
import { lt, and, eq, ne, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Cible absolument tous les comptes SAUF 'elite' dont la periodEnd est dépassée de plus de 30 jours
        const usersToClean = await db
            .select({ id: users.id, clerkId: users.clerkId })
            .from(users)
            .where(
                and(
                    ne(users.status, 'elite'),
                    lt(users.periodEnd, thirtyDaysAgo)
                )
            );

        const userIds = usersToClean.map(u => u.id);
        const clerkIds = usersToClean.map(u => u.clerkId).filter(Boolean) as string[];

        let deletedFoldersCount = 0;

        if (userIds.length > 0) {
            // 1. Supprimer les liens rattachés au clerkId
            if (clerkIds.length > 0) {
                await db.delete(links).where(inArray(links.clerkId, clerkIds));
            }

            // 2. Récupérer et purger tous les dossiers et données pédagogiques associés
            const userFolders = await db
                .select({ id: folders.id })
                .from(folders)
                .where(inArray(folders.clerkId, clerkIds));

            const folderIds = userFolders.map(f => f.id);

            if (folderIds.length > 0) {
                for (const folderId of folderIds) {
                    const mats = await db.select().from(matieres).where(eq(matieres.folderId, folderId));
                    
                    for (const mat of mats) {
                        const chaps = await db.select().from(chapitres).where(eq(chapitres.matiereId, mat.id));
                        
                        for (const chap of chaps) {
                            await db.delete(individualNotes).where(eq(individualNotes.chapitreId, String(chap.id)));
                            await db.delete(echeances).where(eq(echeances.chapitreId, String(chap.id)));
                        }
                        await db.delete(chapitres).where(eq(chapitres.matiereId, mat.id));
                        await db.delete(matieres).where(eq(matieres.id, mat.id));
                    }

                    await db.delete(settings).where(eq(settings.folderId, folderId));
                    await db.delete(folders).where(eq(folders.id, folderId));
                    deletedFoldersCount++;
                }
            }

            // 3. Mettre à jour le statut des utilisateurs nettoyés à 'expired' (on conserve la ligne utilisateur)
            await db.update(users).set({ status: 'expired' }).where(inArray(users.id, userIds));
        }

        return NextResponse.json({ 
            success: true, 
            message: `Nettoyage RGPD réussi : ${deletedFoldersCount} dossiers, liens et comptes purgés pour ${userIds.length} utilisateurs inactifs.` 
        });

    } catch (error) {
        console.error('Erreur lors du cron de nettoyage :', error);
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
    }
}