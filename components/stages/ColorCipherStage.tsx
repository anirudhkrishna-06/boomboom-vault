"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { ParsedPayload } from "@/lib/qr/parser";

const SWATCH: Record<string, string> = {
  RED: "#e2585a",
  BLUE: "#4f8fe2",
  GREEN: "#59c78a",
  YELLOW: "#e0b84a",
  CYAN: "#4fd0e2",
  MAGENTA: "#d15fd6",
  ORANGE: "#e2914f",
  PURPLE: "#9d6fe0",
};

export function ColorCipherStage({
  payload,
  onContinue,
}: {
  payload: ParsedPayload;
  onContinue: (workingAnswer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const colorEntries = Object.entries(payload.colorMap);

  return (
    <StageShell railStage="color">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 04
      </div>
      <h2 className="stage-title">Color cipher</h2>
      <p className="stage-sub">Match each color to its digit, then work through the sequence.</p>

      <div className="cipher-grid">
        {colorEntries.map(([name, num]) => (
          <div className="cipher-row-pair" key={name} style={{ display: "contents" }}>
            <div className="cipher-cell">
              <span className="swatch" style={{ background: SWATCH[name] ?? "#666" }} />
              {name}
            </div>
            <div className="cipher-cell num">{num}</div>
          </div>
        ))}
      </div>

      <span className="field-label">Sequence</span>
      <div className="sequence-row" style={{ marginBottom: 26 }}>
        {payload.colorSequence.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sequence-chip">{c}</span>
            {i < payload.colorSequence.length - 1 && <span className="sequence-arrow">→</span>}
          </span>
        ))}
      </div>

      <span className="field-label">Your working (optional)</span>
      <input
        className="input"
        placeholder="e.g. 5921"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        style={{ fontSize: 18, marginBottom: 4 }}
      />

      <div className="stage-footer">
        <button className="btn btn-primary" onClick={() => onContinue(answer)}>
          Continue →
        </button>
      </div>
    </StageShell>
  );
}
