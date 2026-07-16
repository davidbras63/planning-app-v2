import { supabase } from '@/lib/supabaseClient';

// Fonction pour formater la date en YYYY-MM-DD sans décalage horaire
function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export async function tenterReintegration(userId: string, revisionId: string, chapterId: string, cycleDay: number, nextDueDate: string) {
  // 1. Récupérer les réglages de l'utilisateur (Nombre max de cours par jour)
  const { data: settings } = await supabase
    .from('settings')
    .select('max_days') // Ici on suppose que tu as une colonne max_cours_jour, sinon par défaut on prend 5
    .eq('user_id', userId)
    .single();

  const maxCoursParJour = 5; // Valeur par défaut si non spécifié
  
  // 2. Définir la cible idéale : 2 jours avant le J suivant (nextDueDate)
  const dateLimite = new Date(nextDueDate);
  dateLimite.setDate(dateLimite.getDate() - 2);

  // Date de départ pour la recherche : à partir de demain
  let dateTest = new Date();
  dateTest.setDate(dateTest.getDate() + 1);

  let dateTrouvee = null;

  // 3. Boucle de recherche d'un créneau libre
  while (dateTest <= dateLimite) {
    // Règle A : On saute les dimanches
    if (dateTest.getDay() === 0) {
      dateTest.setDate(dateTest.getDate() + 1);
      continue;
    }

    const dateStr = formatDate(dateTest);

    // Règle B : Compter combien de cours sont déjà prévus ce jour-là
    const { count } = await supabase
      .from('revisions')
      .select('*', { count: 'exact', head: true })
      .eq('due_date', dateStr);

    // Si on a de la place, on prend ce jour !
    if (count !== null && count < maxCoursParJour) {
      dateTrouvee = dateStr;
      break;
    }

    // Sinon, on passe au jour suivant
    dateTest.setDate(dateTest.getDate() + 1);
  }

  // 4. Si une place est trouvée, on met à jour avec le tag "R"
  if (dateTrouvee) {
    const { error } = await supabase
      .from('revisions')
      .update({
        due_date: dateTrouvee,
        cycle_day: `J${cycleDay}R`, // Ajout du petit "R" distinctif pour le planning
        note: null // On réinitialise la note puisqu'il doit être réévalué
      })
      .eq('id', revisionId);

    if (error) throw error;
    return { success: true, date: dateTrouvee };
  }

  // 5. Si pas de place trouvée, on renvoie une alerte pour déclencher le mode "Forcer"
  return { success: false, message: "Pas de place trouvée" };
}
