import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { SocialButtons } from "@/app/account/social-buttons";

export const metadata: Metadata = {
  title: "지원하기 · The Formula",
  description: "AI를 쓰는 사람과 AI로 '내 공식'을 만든 사람의 차이를 경험하세요.",
};

const requirements = [
  {
    title: "AI를 이미 쓰고 있는 사람",
    description:
      "직무에 상관없이, AI를 업무에 활발히 활용하고 있지만 더 체계적으로 만들고 싶은 분.",
  },
  {
    title: "성장하는 현업자",
    description:
      "개발, 디자인, 기획, 마케팅, 데이터 등 분야를 불문하고 커리어를 키워가고 있는 현업자.",
  },
  {
    title: "유연한 마인드",
    description:
      "다양한 직무의 사람들과 열린 마음으로 어울리며 인사이트를 나눌 수 있는 분.",
  },
];

const steps = [
  {
    step: "01",
    title: "소셜 계정으로 가입",
    description:
      "카카오·네이버·구글 계정으로 간편하게 시작해요. 직무와 관심사를 골라 피드를 맞춤화해요.",
  },
  {
    step: "02",
    title: "내 공식 쌓기",
    description:
      "AI로 풀어낸 업무 과정을 '공식'으로 기록하고, 다른 멤버의 공식을 따라해 봐요.",
  },
  {
    step: "03",
    title: "함께 성장하기",
    description:
      "스터디·프로젝트 모임에 참여하고, 신뢰등급을 쌓으며 AX 포트폴리오를 완성해요.",
  },
];

const faqs = [
  {
    q: "비개발자도 참여할 수 있나요?",
    a: "네, 오히려 다양한 직무의 멤버를 환영해요. 디자인, PM, 마케팅, 데이터 등 모든 분야에서 AI를 활용하는 방법을 함께 탐구해요.",
  },
  {
    q: "AI를 얼마나 잘 써야 하나요?",
    a: "이미 ChatGPT 등 AI 도구를 업무에 활발히 쓰고 계신 분을 대상으로 해요. 완전 초보보다는, 이미 잘 쓰고 있지만 더 체계적으로 만들고 싶은 분에게 잘 맞아요.",
  },
  {
    q: "가입하면 무엇을 할 수 있나요?",
    a: "공식 아카이브를 둘러보고, 마음에 드는 공식을 저장·복제하고, 직접 내 공식을 등록할 수 있어요. 스터디·프로젝트 모임에도 지원할 수 있어요.",
  },
  {
    q: "비용이 있나요?",
    a: "별도의 가입비나 수강료는 없어요. 오프라인 모임 시 각자 식사/음료 비용만 부담해요.",
  },
];

export default async function ApplyPage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  return (
    <div className="wrap">
      {/* Header */}
      <div className="eyebrow">합류 모집 중</div>
      <h1 className="page-title">The Formula에 합류하기</h1>
      <p className="page-sub">
        AI를 쓰는 사람과 AI로 ‘내 공식’을 만든 사람의 차이. 지금 바로 직접 경험해
        보세요.
      </p>

      {/* Primary CTA — 토스 폼 + 소셜 (auth-card 마크업) */}
      <section className="view auth on" style={{ marginTop: 32 }}>
        <div className="auth-card">
          {loggedIn ? (
            <>
              <h2 className="auth-title">이미 합류하셨어요 🎉</h2>
              <p className="auth-sub">
                피드에서 새 공식을 만나거나, 내 계정에서 프로필을 다듬어 보세요.
              </p>
              <div className="social">
                <Link href="/" className="sbtn" style={{ background: "var(--blue)", color: "#fff" }}>
                  피드 둘러보기
                </Link>
                <Link
                  href="/account"
                  className="sbtn"
                  style={{ background: "var(--bg-2)", color: "var(--t1)" }}
                >
                  내 계정
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="auth-title">포뮬러, 시작해볼까요?</h2>
              <p className="auth-sub">
                오늘 올린 공식 하나가, 내일의 포트폴리오가 돼요.
              </p>
              <SocialButtons callbackUrl="/account" mode="signup" />
              <p className="auth-terms">
                가입하면 이용약관과 개인정보 처리방침에 동의하게 돼요.
              </p>
              <p className="auth-switch">
                이미 포뮬러세요? <Link href="/account">로그인</Link>
              </p>
            </>
          )}
        </div>
      </section>

      {/* Who we're looking for */}
      <div className="sec">
        <h2>이런 분들을 찾아요</h2>
      </div>
      <div className="grid">
        {requirements.map((req) => (
          <article key={req.title} className="fcard" style={{ cursor: "default" }}>
            <h3>{req.title}</h3>
            <p className="fc-sum" style={{ WebkitLineClamp: "unset" }}>
              {req.description}
            </p>
          </article>
        ))}
      </div>

      {/* How it works */}
      <div className="sec">
        <h2>이렇게 진행돼요</h2>
      </div>
      <div className="grid">
        {steps.map((item) => (
          <article key={item.step} className="fcard" style={{ cursor: "default" }}>
            <div className="eyebrow" style={{ fontSize: 22, marginBottom: 0 }}>
              {item.step}
            </div>
            <h3>{item.title}</h3>
            <p className="fc-sum" style={{ WebkitLineClamp: "unset" }}>
              {item.description}
            </p>
          </article>
        ))}
      </div>

      {/* FAQ */}
      <div className="sec">
        <h2>자주 묻는 질문</h2>
      </div>
      <div className="grid">
        {faqs.map((faq) => (
          <article key={faq.q} className="fcard" style={{ cursor: "default" }}>
            <h3>{faq.q}</h3>
            <p className="fc-sum" style={{ WebkitLineClamp: "unset" }}>
              {faq.a}
            </p>
          </article>
        ))}
      </div>

      {/* Note — join-cta */}
      <div className="join-cta">
        <div>
          <div className="jc-title">학습과 공유에 집중하고 있어요</div>
          <div className="jc-sub">
            성과에 따라 차기 프로젝트(실제 AI 서비스 빌딩) 멤버로 우선 선발돼요.
          </div>
        </div>
        {!loggedIn && (
          <Link href="/apply" className="btn btn-primary">
            지금 시작하기
          </Link>
        )}
      </div>
    </div>
  );
}
