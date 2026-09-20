import { NextRequest, NextResponse } from "next/server";
import { validateVaultCode } from "@/lib/server/challenge-data";
import { pool } from "@/lib/server/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const chitCode = typeof body?.chitCode === "string" ? body.chitCode.trim() : "";
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
    const enteredVaultCode = typeof body?.enteredVaultCode === "string" ? body.enteredVaultCode.trim() : "";
    const mcqScoreRaw = body?.mcqScore;

    if (!chitCode || !teamName) {
      return NextResponse.json({ correct: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    let mcqScore: number;
    if (typeof mcqScoreRaw === "number" && Number.isFinite(mcqScoreRaw)) {
      mcqScore = Math.max(0, Math.min(2, Math.floor(mcqScoreRaw)));
    } else if (typeof mcqScoreRaw === "string" && mcqScoreRaw.trim() !== "") {
      const parsed = Number.parseInt(mcqScoreRaw, 10);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ correct: false, error: "INVALID_MCQ_SCORE" }, { status: 400 });
      }
      mcqScore = Math.max(0, Math.min(2, parsed));
    } else {
      return NextResponse.json({ correct: false, error: "INVALID_MCQ_SCORE" }, { status: 400 });
    }

    if (!enteredVaultCode) {
      return NextResponse.json({ correct: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    const correct = validateVaultCode(chitCode, enteredVaultCode);

    if (!correct) {
      return NextResponse.json({ correct: false });
    }

    try {
      await pool.query(
        `INSERT INTO vault_unlocks (chit_code, team_name, mcq_score) VALUES ($1, $2, $3)`,
        [chitCode, teamName, mcqScore]
      );
    } catch (dbError) {
      console.error("Failed to log vault unlock:", dbError);
    }

    return NextResponse.json({ correct: true });
  } catch {
    return NextResponse.json({ correct: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
