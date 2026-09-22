"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { buildObfuscatedDisplayEntries, deriveChitOffsetKey } from "@/lib/cipher/obfuscation";
import { ParsedPayload } from "@/lib/qr/parser";

const SHAPE_ICON: Record<string, string> = {
  CIRCLE: "O",
  TRIANGLE: "^",
  SQUARE: "[]",
  DIAMOND: "<>",
  STAR: "*",
  HEXAGON: "HX",
  PENTAGON: "P5",
  OVAL: "O-",
  CROSS: "+",
  RING: "()",
};

const SHAPE_DISTRACTORS = ["STAR", "HEXAGON", "PENTAGON", "OVAL", "CROSS", "RING"];

export function ShapeCipherStage({
  payload,
  colorCode,
  savedAnswer,
  onBack,
  onContinue,
}: {
  payload: ParsedPayload;
  colorCode: string;
  savedAnswer: string;
  onBack: () => void;
  onContinue: (workingAnswer: string) => void;
}) {
  const [answer, setAnswer] = useState(savedAnswer);
  const offsetKey = deriveChitOffsetKey(payload.chitCode);
  const shapeEntries = buildObfuscatedDisplayEntries({
    map: payload.shapeMap,
    sequence: payload.shapeSequence,
    candidates: SHAPE_DISTRACTORS,
    chitCode: payload.chitCode,
    namespace: "shape",
  });

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

      <div className="panel cipher-legend">
        <p>
          Use only the number part. For BB117, use 117. Add its digits, keep the last digit, That's your KEY. For each row: Do the following, Number shown against the shape 'minus' The Key you just found, mod 10. If negative, add 10.

        </p>
      </div>

      <div className="cipher-grid">
        {shapeEntries.map((entry) => (
          <div style={{ display: "contents" }} key={entry.name}>
            <div className="cipher-cell">
              <span className="shape-icon">{SHAPE_ICON[entry.name] ?? "?"}</span>
              {entry.name}
            </div>
            <div className="cipher-cell num">{entry.displayDigit}</div>
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
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          &lt;- Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onContinue(answer)}
          disabled={answer.trim().length === 0}
        >
          Continue -&gt;
        </button>
      </div>
    </StageShell>
  );
}
