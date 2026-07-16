import { supabase } from '@/lib/supabaseClient';

/**
 * Recalcule la date pour un J précis d'un chapitre.
 * IMPORTANT : Cette fonction cible le chapitre ET le cycle_day.
 * Elle ne modifie JAMAIS la colonne 'note'.
 */
export async function updateRevisionDate(chapterId: string, cycleDay: number, newDate: string) {
  const { error } = await supabase
    .from('revisions')
    .update({ due_date: newDate }) // On ne modifie QUE la date
    .eq('chapter_id', chapterId) // On cible le chapitre...
    .eq('cycle_day', cycleDay); // ...ET le cycle (ex: J7). 

  if (error) {
    console.error("Erreur lors de la mise à jour de la date :", error);
    throw error;
  }

  return { success: true };
}
