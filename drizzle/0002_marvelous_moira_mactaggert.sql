ALTER TABLE "post" ADD COLUMN "relatedArticleId" text;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_relatedArticleId_post_id_fk" FOREIGN KEY ("relatedArticleId") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_relatedArticle_idx" ON "post" USING btree ("relatedArticleId");