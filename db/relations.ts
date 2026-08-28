// db/relations.ts
import { relations } from "drizzle-orm";
import { folders, echeances, matieres, chapitres, individualNotes, users } from "./schema";

// 1. Relation des dossiers (un dossier contient plusieurs matières)
export const foldersRelations = relations(folders, ({ many }) => ({
  matieres: many(matieres),
}));

// 2. Relation des matières (une matière appartient à un dossier et contient plusieurs chapitres)
export const matieresRelations = relations(matieres, ({ one, many }) => ({
  folder: one(folders, { fields: [matieres.folderId], references: [folders.id] }),
  chapitres: many(chapitres),
}));

export const chapitresRelations = relations(chapitres, ({ one, many }) => ({
  matiere: one(matieres, { fields: [chapitres.matiereId], references: [matieres.id] }),
  notes: many(individualNotes),
  echeances: many(echeances),
}));

export const individualNotesRelations = relations(individualNotes, ({ one }) => ({
    echeance: one(echeances, { 
        fields: [individualNotes.echeanceId], 
        references: [echeances.id] 
    }),
}));

export const echeancesRelations = relations(echeances, ({ one }) => ({
  chapitre: one(chapitres, { fields: [echeances.chapitreId], references: [chapitres.id] }),
}));
