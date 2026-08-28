import { getSettings } from "@/app/actions/settingsActions";
import SettingsView from "@/components/SettingsView";
import { headers } from "next/headers";

export default async function SettingsPage({ params }: { params: Promise<{ folderId: string }> }) {
    // 1. Récupération propre du folderId (Promesse Next.js 15/16)
    const resolvedParams = await params;
    const folderId = resolvedParams.folderId;

    // 2. Récupération de l'ID utilisateur via les en-têtes ou une méthode alternative sans crasher le rendu
    // Si tu stockes le clerkId dans un header ou que tu l'as autrement, adapte ici.
    // Met un identifiant temporaire ou récupère-le proprement :
    const headerList = await headers();
    // Ou si tu veux garder auth() de clerk/server de façon sécurisée :
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();

    if (!userId) {
        return <div>Veuillez vous reconnecter pour accéder aux paramètres.</div>;
    }

    // 3. Récupération des données
    const data = await getSettings(userId, folderId);

    // 4. Rendu
    return <SettingsView initialData={data} clerkId={userId} folderId={folderId} />;
}

