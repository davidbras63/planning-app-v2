import { pgTable, serial, integer, timestamp, text, numeric, jsonb, unique, uniqueIndex, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sql } from "drizzle-orm"


export const echeances = pgTable("echeances", {
    id: serial("id").primaryKey().notNull(),
    chapitreId: integer("chapitre_id"),
    date: timestamp("date", { withTimezone: true, mode: 'string' }),
    nom: text("nom"),
    clerkId: text("clerk_id"),
    stepName: text("step_name"),
    cycleDay: integer("cycle_day"),
	completed: boolean("completed").default(false),
});


export const folders = pgTable("folders", {
  id: serial().primaryKey().notNull(),
  name: text("name").notNull(),
  clerkId: text("clerk_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const matieres = pgTable("matieres", {
	id: serial().primaryKey().notNull(),
	clerkId: text("clerk_id"),
	folderId: integer("folderId").references(() => folders.id),
	nom: text().notNull(),
});

export const chapitres = pgTable("chapitres", {
	id: serial().primaryKey().notNull(),
	matiereId: integer("matiere_id"),
	titre: text().notNull(),
	moyenne: numeric({ precision: 5, scale:  2 }).default('0'),
	nbreQcm: integer("nbre_qcm").default(0),
	dateExamen: timestamp("date_examen", { withTimezone: true, mode: "string" }),
	clerkId: text("clerk_id"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey().notNull(),
  clerkId: text("clerk_id").notNull(),
  folderId: integer("folder_id").notNull().references(() => folders.id),
  cadencier: jsonb("cadencier"),
  seuilBasNote: jsonb("seuil_bas_note"),
  seuilHautNote: jsonb("seuil_haut_note"),
  maxCoursParJour: integer("max_cours_par_jour").default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    // Empêche d'avoir en double les paramètres pour un même utilisateur dans le même dossier
    userFolderUnique: unique("settings_user_folder_unique").on(table.clerkId, table.folderId),
  };
});


export const links = pgTable("links", {
  id: serial().primaryKey().notNull(),
  clerkId: text("clerk_id"),
  label: text("label"),
  url: text("url"),
});

export const individualNotes = pgTable('individual_notes', {
    id: serial('id').primaryKey().notNull(),
    clerkId: text('clerk_id'),
    content: text('content'),
    echeanceId: text('echeance_id'), 
    chapitreId: text('chapitre_id'), // <-- Le lien vers le chapitre
    moyenne: numeric('moyenne', { precision: 5, scale: 2 }).default('0'), // <-- La moyenne stockée par échéance
	isIgnored: boolean('is_ignored').default(false), // <-- Nouveau champ pour ignorer l'affichage du rattrapage
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});


export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	clerkId: text("clerk_id").notNull().unique(),
	email: text("email").unique(),
	status: text("status").default('trial'),
	periodEnd: timestamp("period_end", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
 });
 
;