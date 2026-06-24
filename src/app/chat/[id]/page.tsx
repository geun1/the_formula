// =============================================================================
// 채팅 스레드 (/chat/[id]) — 우리 고유 기능. 레퍼런스 톤으로 리스킨.
// =============================================================================
// 로그인 필요. 참여자가 아니면 notFound. 데이터/권한 로직 그대로 유지:
//   auth() · getMessages(권한 확인) · ChatThread(client: 버블/입력/폴링).
// 레퍼런스 룩: .wrap 컨테이너 + 흰 카드(var(--white)/var(--shadow)/var(--r))
// + 스레드 헤더 .ava-* 아바타. 말풍선/입력/폴링은 ChatThread 가 담당.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMessages } from "@/lib/queries";
import { avaFor, initialOf } from "@/lib/ref-style";
import { ChatThread } from "./chat-thread";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { title: "채팅 · The Formula" };
  const thread = await getMessages(id, userId);
  if (!thread) return { title: "채팅 · The Formula" };
  return {
    title: `${thread.conversation.partner.name}님과의 채팅 · The Formula`,
  };
}

/**
 * 1:1 대화 스레드 — 로그인 필요. 참여자가 아니면 notFound.
 * 메시지 버블 + 입력창 + 폴링은 ChatThread(client)에서 담당해요.
 */
export default async function ChatThreadPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/account?callbackUrl=${encodeURIComponent(`/chat/${id}`)}`);
  }

  const thread = await getMessages(id, userId);
  // 없음 또는 참여자 아님(권한) → 404.
  if (!thread) notFound();

  const { partner } = thread.conversation;

  return (
    <div className="wrap chat-thread-wrap" style={{ maxWidth: 680 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100dvh - 120px)",
          background: "var(--white)",
          borderRadius: "var(--r)",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        {/* 스레드 헤더 — sticky top 은 .chat-thread-head 가 topbar 높이만큼 내려줌 */}
        <header
          className="chat-thread-head"
          style={{
            position: "sticky",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid var(--border)",
            background: "var(--white)",
            padding: "12px 16px",
          }}
        >
          <Link
            href="/chat"
            aria-label="받은함으로"
            style={{
              flexShrink: 0,
              padding: 6,
              borderRadius: 999,
              color: "var(--t2)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            <span aria-hidden>←</span>
          </Link>
          <Link
            href={`/profile/${partner.id}`}
            style={{
              display: "flex",
              minWidth: 0,
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className={`dc-avatar ${avaFor(partner.id)}`} aria-hidden>
              {initialOf(partner.name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--t1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {partner.name}
              </p>
              {partner.role && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--t3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {partner.role}
                </p>
              )}
            </div>
          </Link>
        </header>

        <ChatThread
          conversationId={thread.conversation.id}
          meId={userId}
          partnerName={partner.name}
          initialMessages={thread.messages}
        />
      </div>
    </div>
  );
}
