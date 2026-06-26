ALTER TABLE "interaction" ADD COLUMN "parentId" text;--> statement-breakpoint
ALTER TABLE "interaction" ADD CONSTRAINT "interaction_parentId_interaction_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."interaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interaction_parent_idx" ON "interaction" USING btree ("parentId");