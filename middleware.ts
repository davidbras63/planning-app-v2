import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Définit les routes qui doivent être protégées
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Si on est sur une route protégée, on force la protection
  if (isProtectedRoute(req)) {
    await auth.protect();
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
