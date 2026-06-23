// =============================================================================
// 채팅 받은함 (/chat) — 우리 고유 기능. 레퍼런스 톤으로 리스킨.
// =============================================================================
// 로그인 필요. ?to=<userId> 로 들어오면 해당 멤버와의 대화를 만들거나 가져와
// 스레드(/chat/[id])로 이동해요. 데이터/액션은 그대로 유지:
//   auth() · findOrCreateConversation(렌더-세이프) · getConversations.
// 레퍼런스 룩: .wrap + .page-title/.page-sub + 흰 카드 리스트 + .ava-* 아바타.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConversations, findOrCreateConversation } from "@/lib/queries";
import { EmptyState } from "@/components/ui";
import { avaFor, initialOf } from "@/lib/ref-style";

export const metadata: Metadata = {
  title: "채팅 · The Formula",
  description: "멤버·작성자와 나눈 1:1 대화를 확인해요.",
};

/** 상대 시간 표기(받은함용). */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

type PageProps = {
  searchParams: Promise<{ to?: string }>;
};

/**
 * 받은함(inbox) — 로그인 필요.
 * ?to=<userId> 로 들어오면 해당 멤버와의 대화를 만들거나 가져와 스레드로 이동해요.
 */
export default async function ChatInboxPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  // 비로그인 — 받은함은 로그인 필요. ?to 까지 보존해 로그인 후 복귀.
  if (!userId) {
    const { to } = await searchParams;
    const back = to ? `/chat?to=${encodeURIComponent(to)}` : "/chat";
    redirect(`/account?callbackUrl=${encodeURIComponent(back)}`);
  }

  // ?to=<userId> → 대화 시작/조회 후 스레드로 redirect.
  // 렌더 중이라 뮤테이션 액션(revalidatePath 포함)을 직접 호출하면 안 됨 →
  // 렌더-세이프 헬퍼(findOrCreateConversation)를 사용.
  const { to } = await searchParams;
  if (to) {
    const res = await findOrCreateConversation(userId, to);
    if (res.ok) {
      redirect(`/chat/${res.conversationId}`);
    }
    // 실패(자기 자신/없는 멤버 등)는 받은함을 그대로 보여줘요.
  }

  const conversations = await getConversations(userId);

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">채팅</h1>
        <p className="page-sub">멤버·작성자와 나눈 1:1 대화예요.</p>
      </header>

      {conversations.length === 0 ? (
        <div
          style={{
            background: "var(--white)",
            borderRadius: "var(--r)",
            boxShadow: "var(--shadow)",
            padding: "8px 8px 24px",
          }}
        >
          <EmptyState
            icon="💬"
            title="아직 대화가 없어요"
            description="멤버나 작성자 프로필에서 채팅을 시작해 보세요."
          />
          <div style={{ textAlign: "center" }}>
            <Link href="/members" className="btn btn-primary">
              포뮬러 둘러보기
            </Link>
          </div>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            background: "var(--white)",
            borderRadius: "var(--r)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
          }}
        >
          {conversations.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  transition: "background .15s",
                }}
              >
                <span
                  className={`dc-avatar ${avaFor(c.partner.id)}`}
                  aria-hidden
                >
                  {initialOf(c.partner.name)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--t1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.partner.name}
                      {c.partner.role && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 12,
                            fontWeight: 400,
                            color: "var(--t3)",
                          }}
                        >
                          {c.partner.role}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        color: "var(--t3)",
                      }}
                    >
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 14,
                        color:
                          c.unreadCount > 0 ? "var(--t1)" : "var(--t2)",
                        fontWeight: c.unreadCount > 0 ? 600 : 400,
                      }}
                    >
                      {c.lastMessageBody ?? "새 대화를 시작해 보세요"}
                    </p>
                    {c.unreadCount > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          height: 20,
                          minWidth: 20,
                          flexShrink: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          background: "var(--blue)",
                          padding: "0 6px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
