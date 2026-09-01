import { NextRequest, NextResponse } from "next/server";
import { validateVaultCode } from "@/lib/server/challenge-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chitCode = typeof body?.chitCode === "string" ? body.chitCode.trim() : "";
    const enteredVaultCode = typeof body?.enteredVaultCode === "string" ? body.enteredVaultCode.trim() : "";

    if (!chitCode || !enteredVaultCode) {
      return NextResponse.json({ correct: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    const correct = validateVaultCode(chitCode, enteredVaultCode);

    // Never return the expected code — only the boolean result.
    return NextResponse.json({ correct });
  } catch {
    return NextResponse.json({ correct: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
