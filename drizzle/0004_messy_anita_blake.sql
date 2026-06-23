CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user1Id" text NOT NULL,
	"user2Id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_bookmark" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"memberId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"senderId" text NOT NULL,
	"body" text NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user1Id_user_id_fk" FOREIGN KEY ("user1Id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user2Id_user_id_fk" FOREIGN KEY ("user2Id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_bookmark" ADD CONSTRAINT "member_bookmark_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_bookmark" ADD CONSTRAINT "member_bookmark_memberId_user_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_pair_uq" ON "conversation" USING btree ("user1Id","user2Id");--> statement-breakpoint
CREATE INDEX "conversation_user1_idx" ON "conversation" USING btree ("user1Id");--> statement-breakpoint
CREATE INDEX "conversation_user2_idx" ON "conversation" USING btree ("user2Id");--> statement-breakpoint
CREATE INDEX "conversation_lastMessageAt_idx" ON "conversation" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE UNIQUE INDEX "member_bookmark_user_member_uq" ON "member_bookmark" USING btree ("userId","memberId");--> statement-breakpoint
CREATE INDEX "member_bookmark_user_idx" ON "member_bookmark" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "member_bookmark_member_idx" ON "member_bookmark" USING btree ("memberId");--> statement-breakpoint
CREATE INDEX "message_conversation_idx" ON "message" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "message_sender_idx" ON "message" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX "message_createdAt_idx" ON "message" USING btree ("createdAt");