// Path/slug logic shared by the client uploader and the server Blob layer.
// Must NOT import "@vercel/blob" so it stays safe to bundle into client code.

export const ARCHIVE_WEEKS = [1, 2, 3, 4, 5] as const;
export const ARCHIVE_MEMBERS = [
  "송근일",
  "고민성",
  "김희",
  "이가희",
  "유민혁",
  "신은지",
] as const;

export type ArchiveWeek = (typeof ARCHIVE_WEEKS)[number];
export type ArchiveMember = (typeof ARCHIVE_MEMBERS)[number];

export const ARCHIVE_MAX_BYTES = 200 * 1024 * 1024; // 200MB

export const SLUG_BY_MEMBER: Record<ArchiveMember, string> = {
  송근일: "songgeunil",
  고민성: "gominseong",
  김희: "kimhee",
  이가희: "leegahee",
  유민혁: "yuminhyuk",
  신은지: "shineunji",
};

export const MEMBER_BY_SLUG = Object.fromEntries(
  Object.entries(SLUG_BY_MEMBER).map(([k, v]) => [v, k as ArchiveMember]),
) as Record<string, ArchiveMember>;

export function pathFor(week: ArchiveWeek, member: ArchiveMember): string {
  return `archive/week-${week}/${SLUG_BY_MEMBER[member]}.pdf`;
}

export function isValidWeek(n: unknown): n is ArchiveWeek {
  return typeof n === "number" && ARCHIVE_WEEKS.includes(n as ArchiveWeek);
}

export function isValidMember(s: unknown): s is ArchiveMember {
  return typeof s === "string" && ARCHIVE_MEMBERS.includes(s as ArchiveMember);
}
