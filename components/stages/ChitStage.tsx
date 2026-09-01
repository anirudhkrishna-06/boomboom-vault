"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";

export function ChitStage({
  onValid,
}: {
  onValid: (chitCode: string) => void;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const code = value.trim().toUpperCase();
    if (!code) {
      setError("Enter the code printed on your chit.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/validate-chit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chitCode: code }),
      });
      const data = await res.json();

      if (data.valid) {
        onValid(code);
      } else {
        setError("That chit code wasn't recognized. Check it and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StageShell>
      <div className="center-stage" style={{ gap: 0 }}>
        <div style={{ marginBottom: 44 }}>
          <div className="eyebrow" style={{ justifyContent: "center" }}>
            <span className="rule" />
            TREASURE HUNT
            <span className="rule" />
          </div>
          <h1
            style={{
              fontSize: 34,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            BOOM BOOM
            <br />
            ROBO DA
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 15 }}>
            Round 01 begins with the code on your chit.
          </p>
        </div>

        <div style={{ width: "100%" }}>
          <span className="field-label">Enter chit code</span>
          <input
            className={`input ${error ? "error" : ""}`}
            placeholder="BB117"
            value={value}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleContinue();
            }}
            inputMode="text"
          />
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>

      <div className="stage-footer">
        <button className="btn btn-primary" onClick={handleContinue} disabled={loading}>
          {loading ? "Checking…" : "Continue →"}
        </button>
      </div>
    </StageShell>
  );
}
