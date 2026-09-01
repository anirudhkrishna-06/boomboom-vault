"use client";

const STEPS = [
  { id: "find", label: "01" },
  { id: "scan", label: "02" },
  { id: "adjust", label: "03" },
  { id: "color", label: "04" },
  { id: "shape", label: "05" },
  { id: "vault", label: "06" },
] as const;

export type RailStageId = (typeof STEPS)[number]["id"];

export function ProgressRail({ current }: { current: RailStageId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="rail" aria-label="Challenge progress">
      {STEPS.map((step, idx) => {
        const state = idx < currentIndex ? "done" : idx === currentIndex ? "active" : "";
        const trackFilled = idx < currentIndex;
        return (
          <div className="rail-node" key={step.id}>
            <div className={`rail-step ${state}`}>{step.label}</div>
            {idx < STEPS.length - 1 && <div className={`rail-track ${trackFilled ? "filled" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
