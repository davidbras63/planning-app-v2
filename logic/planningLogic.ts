// Fichier : logic/planningLogic.ts

/**
 * Décalage du cadencier en fonction du changement de J0
 * @param chapitres - La liste actuelle des chapitres
 * @param decalageJours - Nombre de jours à décaler (positif ou négatif)
 */
export const decalerCadencier = (chapitres: any[], decalageJours: number) => {
  return chapitres.map((chapitre) => {
    // Si ton chapitre a une date, on la décale
    if (chapitre.date) {
      const nouvelleDate = new Date(chapitre.date);
      nouvelleDate.setDate(nouvelleDate.getDate() + decalageJours);
      return { ...chapitre, date: nouvelleDate.toISOString() };
    }
    return chapitre;
  });
};
