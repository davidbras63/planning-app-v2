import { pgTable, integer, text, timestamp, serial, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  status: text("status").default("trial"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  cadencier: jsonb("cadencier").default({}),
  seuilBasNote: integer("seuil_bas_note").default(0),
  seuilHautNote: integer("seuil_haut_note").default(20),
  maxJoueurs: integer("max_joueurs").default(1),
});

export const matieres = pgTable("matieres", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: text("nom").notNull(),
  clerkId: text("clerk_id").notNull(),
});

export const chapitres = pgTable("chapitres", {
  id: uuid("id").defaultRandom().primaryKey(),
  titre: text("titre").notNull(),
  matiereId: uuid("matiere_id").references(() => matieres.id),
  clerkId: text("clerk_id").notNull(),
});

export const echeances = pgTable("echeances", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  chapitreId: uuid("chapitre_id").references(() => chapitres.id),
  cycleDay: integer("cycle_day"),
  status: text("status").default("normal"),
  clerkId: text("clerk_id").notNull(),
});

export const individual_notes = pgTable("individual_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  contenu: text("contenu"),
  chapitreId: uuid("chapitre_id").references(() => chapitres.id),
  clerkId: text("clerk_id").notNull(),
});

export const links = pgTable("links", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Relations ---

export const chapitresRelations = relations(chapitres, ({ one, many }) => ({
  matiere: one(matieres, { fields: [chapitres.matiereId], references: [matieres.id] }),
  notes: many(individual_notes),
  echeances: many(echeances),
}));

export const individualNotesRelations = relations(individual_notes, ({ one }) => ({
  chapitre: one(chapitres, { fields: [individual_notes.chapitreId], references: [chapitres.id] }),
}));

export const echeancesRelations = relations(echeances, ({ one }) => ({
  chapitre: one(chapitres, { fields: [echeances.chapitreId], references: [chapitres.id] }),
}));

export const matieresRelations = relations(matieres, ({ many }) => ({
  chapitres: many(chapitres),
}));

