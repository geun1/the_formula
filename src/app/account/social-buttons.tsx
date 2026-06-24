// =============================================================================
// auth 페이지 전용 소셜 로그인 버튼 — 레퍼런스(.social > .sbtn) 마크업 그대로.
// =============================================================================
// signIn(provider) 은 서버에서만 호출 가능하므로 form + 인라인 서버액션 패턴.
// env(AUTH_*_ID)가 설정된 provider 만 노출. 비활성 시 안내 카드.
// 마크업/클래스는 view-07/08-*.html 의 .social / .sbtn(.kakao/.naver) 복제.
// =============================================================================
import { signIn } from "@/auth";

function KakaoIcon() {
  return (
    <span className="sic">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#191600" aria-hidden>
        <path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6-.2.6-.6 2.3-.7 2.6-.1.4.1.4.3.3.2-.1 2.4-1.6 3.4-2.3.6.1 1.2.1 1.8.1 5 0 9-3.1 9-7s-4-7-9-7z" />
      </svg>
    </span>
  );
}

function GitHubIcon() {
  return (
    <span className="sic">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden>
        <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.13-4.56-5.04 0-1.11.39-2.02 1.03-2.73-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.04a9.36 9.36 0 0 1 5 0c1.91-1.31 2.75-1.04 2.75-1.04.55 1.4.2 2.44.1 2.7.64.71 1.03 1.62 1.03 2.73 0 3.92-2.35 4.78-4.58 5.03.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
      </svg>
    </span>
  );
}

type Mode = "login" | "signup";

type ProviderCfg = {
  id: "kakao" | "naver" | "google" | "github";
  env: string;
  cls: string;
  style?: React.CSSProperties;
  label: (mode: Mode) => string;
  icon: React.ReactNode;
};

const PROVIDERS: ProviderCfg[] = [
  {
    id: "kakao",
    env: "AUTH_KAKAO_ID",
    cls: "kakao",
    label: (m) => (m === "login" ? "카카오로 계속하기" : "카카오로 시작하기"),
    icon: <KakaoIcon />,
  },
  {
    id: "naver",
    env: "AUTH_NAVER_ID",
    cls: "naver",
    label: (m) => (m === "login" ? "네이버로 계속하기" : "네이버로 시작하기"),
    icon: (
      <span className="sic" style={{ fontSize: 15, color: "#fff" }}>
        N
      </span>
    ),
  },
  {
    id: "google",
    env: "AUTH_GOOGLE_ID",
    cls: "google",
    label: (m) => (m === "login" ? "Google로 계속하기" : "Google로 시작하기"),
    icon: (
      <span className="sic" style={{ fontSize: 15, fontWeight: 900 }}>
        G
      </span>
    ),
  },
  {
    id: "github",
    env: "AUTH_GITHUB_ID",
    cls: "github",
    style: { background: "#24292f", color: "#fff" },
    label: (m) => (m === "login" ? "GitHub로 계속하기" : "GitHub로 시작하기"),
    icon: <GitHubIcon />,
  },
];

/** 레퍼런스 .social 컨테이너 + .sbtn 버튼. env 설정된 provider만 노출. */
export function SocialButtons({
  callbackUrl = "/",
  mode = "login",
}: {
  callbackUrl?: string;
  mode?: Mode;
}) {
  const enabled = PROVIDERS.filter((p) => process.env[p.env]);

  if (enabled.length === 0) {
    return (
      <p className="auth-terms">
        소셜 로그인 준비 중이에요. 곧 카카오·네이버·구글 로그인을 제공할게요.
      </p>
    );
  }

  return (
    <div className="social">
      {enabled.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className={`sbtn ${p.cls}`} style={p.style}>
            {p.icon}
            {p.label(mode)}
          </button>
        </form>
      ))}
    </div>
  );
}
