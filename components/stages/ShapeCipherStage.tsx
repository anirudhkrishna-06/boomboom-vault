"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { deriveShapeCode } from "@/lib/qr/cipher";
import { ParsedPayload } from "@/lib/qr/parser";

const SHAPE_ICON: Record<string, string> = {
  CIRCLE: "O",
  TRIANGLE: "^",
  SQUARE: "[]",
  DIAMOND: "<>",
};

export function ShapeCipherStage({
  payload,
  colorCode,
  savedAnswer,
  onContinue,
}: {
  payload: ParsedPayload;
  colorCode: string;
  savedAnswer: string;
  onContinue: (workingAnswer: string) => void;
}) {
  const derivedCode = deriveShapeCode(payload);
  const [answer, setAnswer] = useState(savedAnswer || derivedCode);
  const shapeEntries = Object.entries(payload.shapeMap);

  return (
    <StageShell railStage="shape">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 05
      </div>
      <h2 className="stage-title">Shape cipher</h2>
      <p className="stage-sub">Match each shape to its digit, then work through the sequence.</p>

      <div className="code-strip" style={{ marginBottom: 16 }}>
        <span>Color code</span>
        <strong className="mono">{colorCode || "----"}</strong>
      </div>

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
            <span className="sequence-chip">{SHAPE_ICON[s] ? `${SHAPE_ICON[s]} ${s}` : s}</span>
            {i < payload.shapeSequence.length - 1 && <span className="sequence-arrow">-&gt;</span>}
          </span>
        ))}
      </div>

      <span className="field-label">Shape code</span>
      <input
        className="input"
        placeholder="e.g. 8713"
        value={answer}
        inputMode="numeric"
        onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, ""))}
        style={{ fontSize: 18, marginBottom: 4 }}
      />

      <div className="stage-footer">
        <button className="btn btn-primary" onClick={() => onContinue(answer || derivedCode)}>
          Continue -&gt;
        </button>
      </div>
    </StageShell>
  );
}
