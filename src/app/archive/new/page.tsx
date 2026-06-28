import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getArticles, getArchiveDetail } from "@/lib/queries";
import { getArticlePermission } from "@/lib/article-permission";
import type { ArticleOption, ForkRef } from "./create-archive-form";
import { CreateArchiveForm } from "./create-archive-form";

export const metadata: Metadata = {
  title: "공식 작성 · The Formula",
  description:
    "문제→가설→도구→과정→결과로 나만의 AX 공식을 남겨보세요. 참고한 아티클도 연결할 수 있어요.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function NewArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const prefillId = first(sp.articleId) ?? null;
  const refId = first(sp.ref) ?? null;

  // 참고 아티클 선택 풀(최신 아티클). 로그인 사용자에게만 폼을 보이므로
  // 비로그인일 땐 굳이 조회하지 않는다.
  let articles: ArticleOption[] = [];
  let prefill: ArticleOption | null = null;
  if (viewerId) {
    const rows = await getArticles({ sort: "latest" });
    articles = rows.map((p) => ({
      id: p.id,
      title: p.title,
      sourceName: p.sourceName,
    }));

    if (prefillId) {
      const found = articles.find((a) => a.id === prefillId);
      if (found) {
        prefill = found;
      } else {
        // 풀에 없으면(혹시 cardnews 가 아니면) 단건 확인
        const detail = await getArchiveDetail(prefillId);
        if (detail && detail.post.postType === "cardnews") {
          prefill = {
            id: detail.post.id,
            title: detail.post.title,
            sourceName: detail.post.sourceName,
          };
          articles = [prefill, ...articles.filter((a) => a.id !== prefill!.id)];
        }
      }
    }
  }

  // '따라하기' — 원본 공식을 출처로 연결(내용 복제 없음). ref=공식 post.id.
  let forkedFrom: ForkRef | null = null;
  if (viewerId && refId) {
    const detail = await getArchiveDetail(refId);
    if (detail && detail.post.postType === "formula") {
      forkedFrom = {
        id: detail.post.id,
        title: detail.post.title,
        authorName: detail.post.authorName,
      };
    }
  }

  // 'AI와 함께 써보기' 권한 — admin(송근일)/approved 만. 그 외엔 요청 안내.
  const aiPermission = viewerId
    ? await getArticlePermission(viewerId)
    : "none";

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <Link href="/archive" className="back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        아카이브
      </Link>

      <div className="eyebrow">NEW ARCHIVE</div>
      <h1 className="page-title">나만의 공식 남기기</h1>
      <p className="page-sub">
        문제 → 가설 → 도구 → 과정 → 결과 순서로 적어보세요. 참고한 아티클을
        연결하면 서로 이어 보여요.
      </p>

      {viewerId ? (
        <CreateArchiveForm
          articles={articles}
          prefill={prefill}
          aiPermission={aiPermission}
          forkedFrom={forkedFrom}
        />
      ) : (
        <div className="join-cta" style={{ marginTop: 32 }}>
          <div>
            <div className="jc-title">로그인이 필요해요</div>
            <div className="jc-sub">
              공식을 남기려면 먼저 로그인해 주세요. 잠깐이면 돼요.
            </div>
          </div>
          <Link href="/account" className="btn btn-primary">
            로그인하기
          </Link>
        </div>
      )}
    </div>
  );
}
