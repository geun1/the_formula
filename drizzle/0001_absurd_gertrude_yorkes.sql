CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'recruiting' NOT NULL,
	"ownerId" text NOT NULL,
	"ownerName" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"season" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application" (
	"id" text PRIMARY KEY NOT NULL,
	"activityId" text NOT NULL,
	"userId" text NOT NULL,
	"userName" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"postId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"id" text PRIMARY KEY NOT NULL,
	"followerId" text NOT NULL,
	"followingId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "oneLiner" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "difficulty" text DEFAULT 'intermediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "workType" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobRole" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_activityId_activity_id_fk" FOREIGN KEY ("activityId") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followerId_user_id_fk" FOREIGN KEY ("followerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followingId_user_id_fk" FOREIGN KEY ("followingId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activity_status_idx" ON "activity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activity_owner_idx" ON "activity" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "activity_createdAt_idx" ON "activity" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "application_activity_user_uq" ON "application" USING btree ("activityId","userId");--> statement-breakpoint
CREATE INDEX "application_activity_idx" ON "application" USING btree ("activityId");--> statement-breakpoint
CREATE INDEX "application_user_idx" ON "application" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmark_user_post_uq" ON "bookmark" USING btree ("userId","postId");--> statement-breakpoint
CREATE INDEX "bookmark_user_idx" ON "bookmark" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "bookmark_post_idx" ON "bookmark" USING btree ("postId");--> statement-breakpoint
CREATE UNIQUE INDEX "follow_follower_following_uq" ON "follow" USING btree ("followerId","followingId");--> statement-breakpoint
CREATE INDEX "follow_follower_idx" ON "follow" USING btree ("followerId");--> statement-breakpoint
CREATE INDEX "follow_following_idx" ON "follow" USING btree ("followingId");