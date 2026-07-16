import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAccess } from "@/lib/check"; // Le fichier qu'on a créé juste avant
import Sidebar from "./Sidebar";

export default async function ProtectedSidebar() {
  const { userId } = auth();
  
  // Si pas connecté ou pas d'accès, on n'affiche rien (ou on redirige)
  if (!userId) return null;
  
  const hasAccess = await checkAccess(userId);
  if (!hasAccess) {
    return <p>Période d'essai terminée.</p>; // Ou tu peux rediriger
  }

  return <Sidebar />;
}