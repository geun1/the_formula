CREATE TABLE "crawl_source_state" (
	"name" text PRIMARY KEY NOT NULL,
	"url" text,
	"etag" text,
	"lastModified" text,
	"lastStatus" integer,
	"lastSuccessAt" timestamp,
	"lastItemDate" timestamp,
	"consecutiveFailures" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
