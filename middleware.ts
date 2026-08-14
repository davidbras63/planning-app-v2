import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Définit les routes qui doivent être protégées
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/protected(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    
    // Si l'utilisateur n'est pas connecté, on le redirige vers l'accueil "/"
    // au lieu d'appeler .protect() qui cherche /sign-in
    if (!userId) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Exclut les fichiers statiques, images et fichiers systèmes
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Autorise toujours les routes API et tRPC
    "/(api|trpc)(.*)",
  ],
};
