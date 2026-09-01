"use client";

import { StageShell } from "../StageShell";

export function SuccessStage({ chitCode }: { chitCode: string }) {
  return (
    <StageShell>
      <div className="center-stage">
        <div className="success-ring">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12.5L9.5 18L20 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="eyebrow" style={{ justifyContent: "center" }}>
          <span className="rule" />
          {chitCode}
          <span className="rule" />
        </div>
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>Vault unlocked</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 30 + "ch" }}>
          Round 01 complete. Show this screen to the coordinator.
        </p>
      </div>
    </StageShell>
  );
}
