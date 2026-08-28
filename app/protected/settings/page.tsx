import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureUserInitialized } from "@/app/actions/actions";

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/sign-in');
    }

    await ensureUserInitialized(userId);

    // Récupère TOUS les dossiers de l'utilisateur
    const userFolders = await db
        .select({ id: folders.id, name: folders.name })
        .from(folders)
        .where(eq(folders.clerkId, userId));

    return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
            <h2>Tableau de bord</h2>
            <p>Veuillez sélectionner un dossier pour commencer :</p>
            
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                {userFolders.length > 0 ? (
                    userFolders.map((folder) => (
                        <Link 
                            key={folder.id} 
                            href={`/protected/dashboard/${folder.id}`}
                            style={{ padding: '10px 20px', background: '#333', color: 'white', borderRadius: '5px', textDecoration: 'none' }}
                        >
                            {folder.name}
                        </Link>
                    ))
                ) : (
                    <p>Aucun dossier trouvé. Veuillez en créer un.</p>
                )}
            </div>
        </div>
    );
}