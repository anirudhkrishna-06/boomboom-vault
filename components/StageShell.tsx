"use client";

import { ProgressRail, RailStageId } from "./ProgressRail";

export function BrandBar() {
  return (
    <div className="brandbar">
      <div className="brandmark">
        <span className="dot" />
        <span className="name">Boom Boom Robo Da</span>
      </div>
      <span className="round-tag">ROUND 01</span>
    </div>
  );
}

export function StageShell({
  railStage,
  children,
}: {
  railStage?: RailStageId;
  children: React.ReactNode;
}) {
  return (
    <div className="app-frame">
      <BrandBar />
      {railStage && <ProgressRail current={railStage} />}
      <div className="stage" key={railStage ?? "intro"}>
        {children}
      </div>
    </div>
  );
}
