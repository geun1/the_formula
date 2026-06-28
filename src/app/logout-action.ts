"use server";

import { signOut } from "@/auth";

/** 헤더 메뉴 등 클라이언트 컴포넌트의 form action 에서 호출하는 로그아웃. */
export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
