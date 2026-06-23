import { del, list, put } from "@vercel/blob";

export interface MemberRecord {
  id: string;
  name: string;
  role: string;
  company?: string;
  bio: string;
  interests: string[];
  github?: string;
  website?: string;
  photoUrl: string;
  photoPath: string;
  createdAt: string;
}

const REGISTRY_PATH = "members/registry.json";

async function readRegistry(): Promise<MemberRecord[]> {
  const { blobs } = await list({ prefix: REGISTRY_PATH });
  const blob = blobs.find((b) => b.pathname === REGISTRY_PATH);
  if (!blob) return [];
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as MemberRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeRegistry(records: MemberRecord[]): Promise<void> {
  await put(REGISTRY_PATH, JSON.stringify(records, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function listMembers(): Promise<MemberRecord[]> {
  const records = await readRegistry();
  return [...records].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export interface MemberInput {
  name: string;
  role: string;
  company?: string;
  bio: string;
  interests: string[];
  github?: string;
  website?: string;
  photo: File;
}

function normalizeUrl(input: string | undefined): string | undefined {
  const v = input?.trim();
  if (!v) return undefined;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function normalizeGithub(input: string | undefined): string | undefined {
  const v = input?.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return normalizeUrl(v);
  const handle = v.replace(/^@/, "").replace(/^github\.com\//i, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(handle)) return undefined;
  return `https://github.com/${handle}`;
}

export async function registerMember(input: MemberInput): Promise<MemberRecord> {
  if (!input.name.trim() || !input.role.trim() || !input.bio.trim()) {
    throw new Error("이름, 역할, 자기소개는 필수입니다.");
  }
  if (!input.photo || input.photo.size === 0) {
    throw new Error("프로필 사진은 필수입니다.");
  }
  if (!input.photo.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const id = crypto.randomUUID();
  const ext =
    input.photo.type === "image/png"
      ? "png"
      : input.photo.type === "image/webp"
        ? "webp"
        : input.photo.type === "image/gif"
          ? "gif"
          : "jpg";
  const photoPath = `members/photos/${id}.${ext}`;
  const blob = await put(photoPath, input.photo, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: input.photo.type,
  });

  const record: MemberRecord = {
    id,
    name: input.name.trim(),
    role: input.role.trim(),
    company: input.company?.trim() || undefined,
    bio: input.bio.trim(),
    interests: input.interests.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    github: normalizeGithub(input.github),
    website: normalizeUrl(input.website),
    photoUrl: blob.url,
    photoPath: blob.pathname,
    createdAt: new Date().toISOString(),
  };

  const current = await readRegistry();
  current.push(record);
  await writeRegistry(current);

  return record;
}

export async function deleteMember(id: string): Promise<void> {
  const current = await readRegistry();
  const target = current.find((m) => m.id === id);
  if (!target) return;
  await del(target.photoPath).catch(() => {});
  await writeRegistry(current.filter((m) => m.id !== id));
}
