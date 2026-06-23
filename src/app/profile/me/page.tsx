import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/queries";

/**
 * /profile/me — 세션 유저의 프로필로 라우팅한다.
 * 비로그인이면 로그인으로, 로그인이면 /profile/[id] 로 redirect.
 * (실제 렌더/메타데이터는 /profile/[id] 가 담당한다.)
 */
export default async function MyProfilePage() {
  const userId = await currentUserId();
  if (!userId) redirect("/apply");
  redirect(`/profile/${userId}`);
}
