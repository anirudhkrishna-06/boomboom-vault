"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { ParsedPayload } from "@/lib/qr/parser";

const SHAPE_ICON: Record<string, string> = {
  CIRCLE: "○",
  TRIANGLE: "△",
  SQUARE: "□",
  DIAMOND: "◇",
};

export function ShapeCipherStage({
  payload,
  onContinue,
}: {
  payload: ParsedPayload;
  onContinue: (workingAnswer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const shapeEntries = Object.entries(payload.shapeMap);

  return (
    <StageShell railStage="shape">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 05
      </div>
      <h2 className="stage-title">Shape cipher</h2>
      <p className="stage-sub">Match each shape to its digit, then work through the sequence.</p>

      <div className="cipher-grid">
        {shapeEntries.map(([name, num]) => (
          <div style={{ display: "contents" }} key={name}>
            <div className="cipher-cell">
              <span className="shape-icon">{SHAPE_ICON[name] ?? "?"}</span>
              {name}
            </div>
            <div className="cipher-cell num">{num}</div>
          </div>
        ))}
      </div>

      <span className="field-label">Sequence</span>
      <div className="sequence-row" style={{ marginBottom: 26 }}>
        {payload.shapeSequence.map((s, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sequence-chip">
              {SHAPE_ICON[s] ? `${SHAPE_ICON[s]} ${s}` : s}
            </span>
            {i < payload.shapeSequence.length - 1 && <span className="sequence-arrow">→</span>}
          </span>
        ))}
      </div>

      <span className="field-label">Your working (optional)</span>
      <input
        className="input"
        placeholder="e.g. 8713"
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
