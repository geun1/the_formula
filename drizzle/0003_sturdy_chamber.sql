CREATE TABLE "raw_article" (
	"id" text PRIMARY KEY NOT NULL,
	"sourceName" text NOT NULL,
	"sourceUrl" text NOT NULL,
	"originalTitle" text NOT NULL,
	"rawContent" text NOT NULL,
	"category" text,
	"collectedAt" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"postId" text,
	"claimedAt" timestamp,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "raw_article_sourceUrl_unique" UNIQUE("sourceUrl")
);
--> statement-breakpoint
ALTER TABLE "raw_article" ADD CONSTRAINT "raw_article_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raw_article_status_idx" ON "raw_article" USING btree ("status");--> statement-breakpoint
CREATE INDEX "raw_article_createdAt_idx" ON "raw_article" USING btree ("createdAt");