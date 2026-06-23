import { auth } from "@/auth";
import { NavBar } from "@/components/nav-bar";

/**
 * Navigation — Server Component.
 * auth() 세션을 읽어 로그인/프로필 상태를 NavBar(Client)로 전달한다.
 * (Next 16: 보안·세션은 데이터 소스 가까이 — 미들웨어 의존 X)
 */
export async function Navigation() {
  const session = await auth();
  const u = session?.user;
  return (
    <NavBar
      user={u?.id ? { id: u.id, name: u.name ?? null, image: u.image ?? null } : null}
    />
  );
}
