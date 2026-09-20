"use client";

import { StageShell } from "../StageShell";
import { McqAnswer, McqGate } from "@/lib/mcq/questions";

export function SuccessStage({
  chitCode,
  teamName,
  mcqAnswers,
}: {
  chitCode: string;
  teamName: string;
  mcqAnswers?: Partial<Record<McqGate, McqAnswer>>;
}) {
  const answers = mcqAnswers ?? {};

  const mcqRows = [
    { gate: "color" as const, label: "Color MCQ", answer: answers.color },
    { gate: "shape" as const, label: "Shape MCQ", answer: answers.shape },
  ];
  const mcqScore = mcqRows.filter((row) => row.answer?.isCorrect).length;

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
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>
          Team: <strong>{teamName}</strong>
        </p>
      </div>

      <div className="panel mcq-review">
        <div className="mcq-review-head">
          <span className="field-label">MCQ</span>
          <strong className="mono">{mcqScore}/2</strong>
        </div>
        {mcqRows.map((row) => (
          <div className="mcq-review-row" key={row.gate}>
            <div>
              <span className="mono">{row.label}</span>
              <p>{row.answer?.selectedOption ?? "No answer recorded"}</p>
            </div>
            <strong className={row.answer?.isCorrect ? "mcq-correct" : "mcq-wrong"}>
              {row.answer ? (row.answer.isCorrect ? "CORRECT" : "WRONG") : "MISSING"}
            </strong>
          </div>
        ))}
      </div>
    </StageShell>
  );
}