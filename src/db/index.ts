// Drizzle 클라이언트 — Neon serverless(http) 드라이버.
// 서버리스 환경에서 단발 쿼리/집계에 최적. 트랜잭션이 필요하면 neon-serverless(Pool)로 교체.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL 환경변수가 없습니다. Neon(Vercel Marketplace) 프로비저닝 후 `vercel env pull .env.local` 하세요.",
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export { schema };
