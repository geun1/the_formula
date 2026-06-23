import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ARCHIVE_MAX_BYTES,
  deleteArchive,
  isValidMember,
  isValidWeek,
  listArchive,
  pathFor,
} from "@/lib/archive-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const items = await listArchive();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "list failed" },
      { status: 500 },
    );
  }
}

// Client-upload handshake. The browser uploads the PDF directly to Vercel
// Blob, so the file never passes through this function — avoiding the
// 4.5MB serverless request-body limit that blocked large presentations.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as {
          week?: unknown;
          member?: unknown;
        };
        const week = Number(payload.week);
        const member = payload.member;
        if (!isValidWeek(week)) throw new Error("invalid week");
        if (!isValidMember(member)) throw new Error("invalid member");
        if (pathname !== pathFor(week, member)) {
          throw new Error("invalid path");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: ARCHIVE_MAX_BYTES,
        };
      },
      onUploadCompleted: async () => {
        // Listing reads straight from Blob by prefix, so nothing to persist.
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = Number(searchParams.get("week"));
    const member = searchParams.get("member");

    if (!isValidWeek(week)) {
      return NextResponse.json({ error: "invalid week" }, { status: 400 });
    }
    if (!isValidMember(member)) {
      return NextResponse.json({ error: "invalid member" }, { status: 400 });
    }

    await deleteArchive(week, member);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
