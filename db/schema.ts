import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm"; // AJOUTE CETTE LIGNE


export const links = pgTable("links", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const matieres = pgTable("matieres", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: text("nom").notNull(),
  userId: uuid("user_id").references(() => users.id),
});

export const chapitres = pgTable("chapitres", {
  id: uuid("id").defaultRandom().primaryKey(),
  titre: text("titre").notNull(),
  matiereId: uuid("matiere_id").references(() => matieres.id),
});

export const echeances = pgTable("echeances", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  chapitreId: uuid("chapitre_id").references(() => chapitres.id),
  cycleDay: integer("cycle_day"),
  status: text("status").default("normal"), // "normal" ou "reintegre"
});

export const individual_notes = pgTable("individual_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  contenu: text("contenu"),
  chapitreId: uuid("chapitre_id").references(() => chapitres.id),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  clerkId: text("clerk_id").notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

// Relations
export const chapitresRelations = relations(chapitres, ({ many }) => ({
  notes: many(individual_notes),
  echeances: many(echeances),
}));

export const individualNotesRelations = relations(individual_notes, ({ one }) => ({
  chapitre: one(chapitres, {
    fields: [individual_notes.chapitreId],
    references: [chapitres.id],
  }),
}));

export const echeancesRelations = relations(echeances, ({ one }) => ({
  chapitre: one(chapitres, {
    fields: [echeances.chapitreId],
    references: [chapitres.id],
  }),
}));

export const matieresRelations = relations(matieres, ({ many }) => ({
  chapitres: many(chapitres),
}));
