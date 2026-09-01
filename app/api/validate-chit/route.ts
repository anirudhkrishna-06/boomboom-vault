import { NextRequest, NextResponse } from "next/server";
import { findChitPublicInfo } from "@/lib/server/challenge-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chitCode = typeof body?.chitCode === "string" ? body.chitCode.trim() : "";

    if (!chitCode) {
      return NextResponse.json({ valid: false, error: "MISSING_CODE" }, { status: 400 });
    }

    const info = findChitPublicInfo(chitCode);

    if (!info.exists) {
      return NextResponse.json({ valid: false, error: "NOT_FOUND" });
    }

    return NextResponse.json({ valid: true, difficulty: info.difficulty ?? null });
  } catch {
    return NextResponse.json({ valid: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
