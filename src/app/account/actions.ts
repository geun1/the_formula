"use server";
// =============================================================================
// 계정 프로필 편집 서버 액션 (account 섹션 소유)
// =============================================================================
// 규칙(AGENTS.md / Next 16)
// - auth() 로 세션 확인. 비로그인 → { ok:false }. 직접 호출 대비 서버 재검증.
// - zod 입력검증. revalidatePath 로 프로필/계정 갱신.
// - 기존 컬럼만 업데이트(name/role/jobRole/company/bio/interests). 파생값 X.
// =============================================================================
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import type { ActionResult } from "@/app/actions";

// 외부 링크: 선택. 빈값 → null, 스킴 없으면 https:// 자동 보정 후 형식 검증.
const urlField = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((v) => {
    const s = (v ?? "").trim();
    if (!s) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  })
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/.test(v), {
    message: "올바른 주소를 입력해 주세요.",
  });

const profileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(60),
  role: z.string().trim().max(80).default(""),
  jobRole: z.string().trim().max(40).nullish(),
  company: z.string().trim().max(80).nullish(),
  bio: z.string().trim().max(600).default(""),
  interests: z.array(z.string().trim().min(1)).max(20).default([]),
  github: urlField,
  homepage: urlField,
  blog: urlField,
});

export type UpdateProfileInput = {
  name: string;
  role?: string;
  jobRole?: string | null;
  company?: string | null;
  bio?: string;
  interests?: string[];
  github?: string | null;
  homepage?: string | null;
  blog?: string | null;
};

/** 내 프로필 편집 저장. 세션 유저 본인만. */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "로그인이 필요해요." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.",
    };
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      role: parsed.data.role,
      jobRole: parsed.data.jobRole ?? null,
      company: parsed.data.company ?? null,
      bio: parsed.data.bio,
      interests: parsed.data.interests,
      github: parsed.data.github,
      homepage: parsed.data.homepage,
      blog: parsed.data.blog,
    })
    .where(eq(users.id, userId));

  revalidatePath("/account");
  revalidatePath("/profile/me");
  revalidatePath(`/profile/${userId}`);
  return { ok: true };
}
