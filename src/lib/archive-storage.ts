import { del, list } from "@vercel/blob";
import {
  type ArchiveMember,
  type ArchiveWeek,
  MEMBER_BY_SLUG,
  isValidWeek,
  pathFor,
} from "./archive-shared";

export {
  ARCHIVE_MEMBERS,
  ARCHIVE_WEEKS,
  ARCHIVE_MAX_BYTES,
  isValidMember,
  isValidWeek,
  pathFor,
} from "./archive-shared";
export type { ArchiveMember, ArchiveWeek } from "./archive-shared";

export interface ArchiveItem {
  week: ArchiveWeek;
  member: ArchiveMember;
  url: string;
  size: number;
  uploadedAt: string;
  pathname: string;
}

export async function listArchive(): Promise<ArchiveItem[]> {
  const { blobs } = await list({ prefix: "archive/" });
  const items: ArchiveItem[] = [];
  for (const b of blobs) {
    const m = b.pathname.match(/^archive\/week-(\d+)\/([^/]+)\.pdf$/);
    if (!m) continue;
    const week = Number(m[1]);
    const slug = m[2];
    if (!isValidWeek(week)) continue;
    const member = MEMBER_BY_SLUG[slug];
    if (!member) continue;
    items.push({
      week,
      member,
      url: b.url,
      size: b.size,
      uploadedAt:
        typeof b.uploadedAt === "string"
          ? b.uploadedAt
          : b.uploadedAt.toISOString(),
      pathname: b.pathname,
    });
  }
  return items;
}

export async function deleteArchive(
  week: ArchiveWeek,
  member: ArchiveMember,
): Promise<void> {
  await del(pathFor(week, member));
}
