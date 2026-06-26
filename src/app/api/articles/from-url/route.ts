// =============================================================================
// POST /api/articles/from-url — 관리자가 임의 기사 URL 을 피드에 추가
// =============================================================================
// 로그인 + 관리자(ADMIN_USER_IDS) 필수. 크론과 동일 파이프라인으로 한 건 동기 처리:
//   크롤 → 큐(멱등) → Gemini 가공 → 발행. 크롤+AI 가 길어 maxDuration 300.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canAddArticle } from "@/lib/article-permission";
import { ingestAndPublishUrl } from "@/lib/ingest-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  if (!(await canAddArticle(session.user.id))) {
    return NextResponse.json(
      { error: "아티클 추가 권한이 없어요. 권한을 먼저 요청해주세요." },
      { status: 403 },
    );
  }

  let url = "";
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body?.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if (!url.trim()) {
    return NextResponse.json({ error: "URL 을 입력해주세요." }, { status: 400 });
  }

  const result = await ingestAndPublishUrl(url);

  // 신규 발행 시 피드/아카이브 캐시 갱신
  if (result.ok && result.status === "published") {
    revalidatePath("/");
    revalidatePath("/archive");
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
