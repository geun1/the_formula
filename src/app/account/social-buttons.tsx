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

type Mode = "login" | "signup";

type ProviderCfg = {
  id: "kakao" | "naver" | "google";
  env: string;
  cls: string;
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
          <button type="submit" className={`sbtn ${p.cls}`}>
            {p.icon}
            {p.label(mode)}
          </button>
        </form>
      ))}
    </div>
  );
}
