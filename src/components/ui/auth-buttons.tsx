// =============================================================================
// 소셜 로그인 버튼 (카카오 / 네이버 / 구글) + 로그아웃
// =============================================================================
// Auth.js v5 의 signIn(provider) / signOut() 는 서버에서만 호출 가능하므로
// form + 인라인 서버액션(form action) 패턴으로 감싼다(클라이언트 JS 없이 동작).
// env(AUTH_*_ID)가 설정된 provider 만 노출.
// =============================================================================
import type { ReactNode } from "react";
import { signIn, signOut } from "@/auth";

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191600" aria-hidden>
      <path d="M12 3.2C6.6 3.2 2.2 6.6 2.2 10.8c0 2.7 1.8 5.1 4.6 6.5-.2.7-.7 2.5-.8 2.9-.1.5.2.5.4.4.2-.1 2.5-1.7 3.6-2.4.6.1 1.3.1 2 .1 5.4 0 9.8-3.4 9.8-7.5S17.4 3.2 12 3.2z" />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M11.7 3v7.1L8.3 3H3v14h5.3V9.9l3.4 7.1H17V3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.92v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.92a9 9 0 0 0 0 8.12l3.06-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .92 4.94l3.06 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

const btnBase =
  "inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";

type ProviderId = "kakao" | "naver" | "google";

const PROVIDERS: {
  id: ProviderId;
  env: string;
  label: string;
  cls: string;
  icon: ReactNode;
}[] = [
  {
    id: "kakao",
    env: "AUTH_KAKAO_ID",
    label: "카카오로 시작하기",
    cls: "bg-[#FEE500] text-[#191600] hover:brightness-95",
    icon: <KakaoIcon />,
  },
  {
    id: "naver",
    env: "AUTH_NAVER_ID",
    label: "네이버로 시작하기",
    cls: "bg-[#03C75A] text-white hover:brightness-95",
    icon: <NaverIcon />,
  },
  {
    id: "google",
    env: "AUTH_GOOGLE_ID",
    label: "Google로 계속하기",
    cls: "border border-border bg-card text-foreground hover:border-muted",
    icon: <GoogleIcon />,
  },
];

export type SocialLoginButtonsProps = {
  /** 로그인 성공 후 이동 경로 */
  callbackUrl?: string;
};

/** 카카오/네이버/구글 소셜 로그인 버튼 묶음. env 설정된 provider만 노출. */
export function SocialLoginButtons({ callbackUrl = "/" }: SocialLoginButtonsProps) {
  const enabled = PROVIDERS.filter((p) => process.env[p.env]);

  if (enabled.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm text-muted">
        소셜 로그인 준비 중이에요. 곧 카카오·네이버·구글 로그인을 제공할게요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {enabled.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className={`${btnBase} ${p.cls}`}>
            {p.icon}
            {p.label}
          </button>
        </form>
      ))}
    </div>
  );
}

/** 단일 provider 버튼(하위호환). 기본 google. */
export function SignInButton({
  provider = "google",
  callbackUrl = "/",
  label,
  className,
}: {
  provider?: ProviderId;
  callbackUrl?: string;
  label?: string;
  className?: string;
}) {
  const cfg = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[2];
  return (
    <form
      action={async () => {
        "use server";
        await signIn(cfg.id, { redirectTo: callbackUrl });
      }}
    >
      <button type="submit" className={`${btnBase} ${cfg.cls} ${className ?? ""}`.trim()}>
        {cfg.icon}
        {label ?? cfg.label}
      </button>
    </form>
  );
}

export type SignOutButtonProps = { label?: string; className?: string };

/** 로그아웃 버튼. */
export function SignOutButton({ label = "로그아웃", className }: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className={`${btnBase} border border-border text-muted hover:border-muted hover:text-foreground ${className ?? ""}`.trim()}
      >
        {label}
      </button>
    </form>
  );
}
