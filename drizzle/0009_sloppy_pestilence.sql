CREATE TABLE "article_permission_request" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "article_permission_request_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "article_permission_request" ADD CONSTRAINT "article_permission_request_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apr_status_idx" ON "article_permission_request" USING btree ("status");