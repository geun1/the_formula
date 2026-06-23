import { NextRequest, NextResponse } from "next/server";
import {
  deleteMember,
  listMembers,
  registerMember,
} from "@/lib/member-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const items = await listMembers();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "list failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "");
    const role = String(form.get("role") ?? "");
    const company = String(form.get("company") ?? "");
    const bio = String(form.get("bio") ?? "");
    const interestsRaw = String(form.get("interests") ?? "");
    const github = String(form.get("github") ?? "");
    const website = String(form.get("website") ?? "");
    const photo = form.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "photo required" }, { status: 400 });
    }
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "photo max 5MB" }, { status: 400 });
    }

    const interests = interestsRaw
      .split(/[,#\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const record = await registerMember({
      name,
      role,
      company,
      bio,
      interests,
      github,
      website,
      photo,
    });
    return NextResponse.json({ item: record });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "register failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await deleteMember(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
