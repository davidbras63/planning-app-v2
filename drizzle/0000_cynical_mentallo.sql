CREATE TABLE "chapitres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titre" text NOT NULL,
	"matiere_id" uuid
);
--> statement-breakpoint
CREATE TABLE "echeances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"chapitre_id" uuid,
	"cycle_day" integer,
	"status" text DEFAULT 'normal'
);
--> statement-breakpoint
CREATE TABLE "individual_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contenu" text,
	"chapitre_id" uuid
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matieres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"clerk_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapitres" ADD CONSTRAINT "chapitres_matiere_id_matieres_id_fk" FOREIGN KEY ("matiere_id") REFERENCES "public"."matieres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_chapitre_id_chapitres_id_fk" FOREIGN KEY ("chapitre_id") REFERENCES "public"."chapitres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "individual_notes" ADD CONSTRAINT "individual_notes_chapitre_id_chapitres_id_fk" FOREIGN KEY ("chapitre_id") REFERENCES "public"."chapitres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matieres" ADD CONSTRAINT "matieres_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;