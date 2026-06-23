// 머신 API(크롤러/AI 서버) 키 인증. Authorization: Bearer <KEY> 또는 x-api-key.
import type { NextRequest } from "next/server";

export type AuthCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function requireIngestKey(req: NextRequest): AuthCheck {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "INGEST_API_KEY 가 설정되지 않았어요. 서버 환경변수를 설정해 주세요.",
    };
  }
  const auth = req.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const apiKey = req.headers.get("x-api-key")?.trim() ?? null;
  const provided = bearer ?? apiKey;
  if (!provided) {
    return {
      ok: false,
      status: 401,
      error: "API 키가 필요해요. Authorization: Bearer <KEY> 헤더를 넣어 주세요.",
    };
  }
  if (provided !== expected) {
    return { ok: false, status: 401, error: "유효하지 않은 API 키예요." };
  }
  return { ok: true };
}
