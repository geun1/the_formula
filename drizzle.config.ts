import { defineConfig } from "drizzle-kit";

// drizzle-kit 은 .env 를 자동 로드하지 않으므로 Node 의 env 파일 로더로 직접 주입.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local 이 없으면 무시 (CI 등에서는 환경변수가 이미 주입됨)
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // 마이그레이션/DDL 은 pgbouncer 풀러를 우회하는 unpooled 연결이 안전.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
