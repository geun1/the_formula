import { avaFor, initialOf } from "@/lib/ref-style";

export type AvatarVariant = "dc" | "ac" | "sm" | "md" | "lg" | "me";

export type AvatarProps = {
  /** 안정 id — ava-N 그라데이션 시드 */
  id: string;
  name?: string | null;
  /** 우선 사용할 이미지 URL (있으면 그라데이션 원 안에 이미지) */
  src?: string | null;
  /**
   * 레퍼런스 스킨 변형:
   * dc(.dc-avatar 48) / ac(.ac-avatar 48) / sm(.avatar-sm 22) /
   * md(.avatar-md 40) / lg(.avatar-lg 72) / me(.me 34)
   */
  variant?: AvatarVariant;
  /** (호환) 숫자 size — 미지정 variant 일 때 가장 가까운 레퍼런스 클래스로 매핑 */
  size?: number;
  className?: string;
};

const VARIANT_CLASS: Record<AvatarVariant, string> = {
  dc: "dc-avatar",
  ac: "ac-avatar",
  sm: "avatar-sm",
  md: "avatar-md",
  lg: "avatar-lg",
  me: "me",
};

// 숫자 size → 가장 가까운 레퍼런스 변형(기존 numeric 호출 호환).
function sizeToVariant(size: number): AvatarVariant {
  if (size <= 26) return "sm";
  if (size <= 36) return "me";
  if (size <= 44) return "md";
  if (size <= 60) return "dc";
  return "lg";
}

/**
 * 아바타. reference.css 의 *-avatar + ava-N 그라데이션 원 + 이니셜.
 * src 가 있으면 같은 원 안에 이미지를 채워요(object-cover).
 */
export function Avatar({ id, name, src, variant, size, className }: AvatarProps) {
  const v: AvatarVariant = variant ?? (size ? sizeToVariant(size) : "md");
  const ava = avaFor(id);
  const initial = initialOf(name ?? undefined);
  // me 변형은 reference.css 가 고정 그라데이션을 갖지만, 그 외엔 ava-N 으로 분산.
  const cls = [VARIANT_CLASS[v], v === "me" ? "" : ava, className]
    .filter(Boolean)
    .join(" ");
  // numeric size 가 명시되면 인라인으로 정확한 크기 보장(레퍼런스 클래스 위에 덮어씀).
  const style =
    size != null ? { width: size, height: size, fontSize: size * 0.4 } : undefined;

  if (src) {
    return (
      <span className={cls} style={style} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name ? `${name} 아바타` : "아바타"}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      </span>
    );
  }

  return (
    <span className={cls} style={style} aria-label={name ? `${name} 아바타` : "아바타"}>
      {initial}
    </span>
  );
}
