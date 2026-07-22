// types/types.ts
export interface Dossier {
  id: string;
  nom: string;
  user_id: string;
}

export interface Matiere {
  id: string;
  dossier_id: string;
  nom: string;
}

export interface Echeance {
  id: string;
  chapitre_id: string;
  type_echeance: string; // 'J0', 'J3', etc.
  date_prevue: string;
  faite: boolean;
  note: number;
}
