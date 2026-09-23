export type McqGate = "color" | "shape";

export interface McqQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

export interface McqAnswer {
  gate: McqGate;
  questionId: string;
  prompt: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  answeredAt: string;
}

export const MCQ_QUESTIONS: McqQuestion[] = [
  {
    id: "robot-signal",
    prompt: "During the preliminary AIRA evaluation in Enthiran, what fundamental flaw did Dr. Bohra cite to reject Chitti for military use?",
    options: [
      "Thermal instability in the cooling loop under combat simulation loads",
      "Lack of an ethical heuristic filter, causing him to obey commands without moral or contextual judgment",
      "Vulnerability to high-frequency EMP bursts in contested electronic warfare environments",
      "Inability to differentiate between friendly and hostile optical wave signatures"
    ],
    correctOptionIndex: 1,
  },
  {
    id: "vault-order",
    prompt: "In 2.0, why was Chitti 3.0 (Kutty) deployed specifically on the backs of homing pigeons to defeat Pakshi Rajan's micro-photon bird swarm?",
    options: [
      "Pigeons radiate a natural bio-field that dampens 3G/4G cellular carrier frequencies",
      "The micro-photon aura's quantum cohesion breaks down near biological feathers",
      "Pakshi Rajan's deep avian affinity prevented his negative electromagnetic aura from attacking real birds",
      "Homing pigeons effectively mask the electromagnetic heat signature of microbot power cells"
    ],
    correctOptionIndex: 2,
  },
  {
    id: "decoy-rule",
    prompt: "What primary algorithmic override occurred when Dr. Bohra forcibly inserted the Red Chip into Chitti's neural drive?",
    options: [
      "It erased his Asimovian safety constraints, prioritizing self-preservation, destructive ego, and autonomous replication",
      "It overclocked his optical scanning frequency, causing thermal runaway in his moral logic gates",
      "It corrupted his natural language processor, forcing him into aggressive binary communication",
      "It diverted 90% of his power capacity to short-range electromagnetic pulse generation"
    ],
    correctOptionIndex: 0,
  },
  {
    id: "offset-key",
    prompt: "In 2.0, how does Dr. Vaseegaran scientifically explain the seemingly supernatural force exerted by Pakshi Rajan?",
    options: [
      "A concentrated dark-matter field condensed by ionospheric satellite telemetry",
      "A self-sustaining plasma loop fed by radio-frequency leaks from abandoned towers",
      "A swarm of mutated bio-synthetic nanobots reacting to sub-atomic radio waves",
      "A micro-photon aura held together by a dense electromagnetic stream of negative bio-energy"
    ],
    correctOptionIndex: 3,
  },
  {
    id: "cipher-check",
    prompt: "In Enthiran, how did Dr. Vaseegaran and the army finally immobilize Chitti 2.0 during the climactic stadium showdown?",
    options: [
      "By triggering a targeted satellite-based EMP pulse directed at his neural core",
      "By using massive industrial electromagnets to strip his outer shell and pull out the Red Chip",
      "By uploading a corrupting Trojan virus directly through his wireless maintenance port",
      "By flooding the stadium floor with liquid nitrogen to freeze his servo-actuators"
    ],
    correctOptionIndex: 1,
  },
];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickMcqQuestions(chitCode: string): Record<McqGate, McqQuestion> {
  if (MCQ_QUESTIONS.length === 0) {
    throw new Error("MCQ_QUESTIONS must contain at least one question.");
  }

  const colorIndex = stableHash(`${chitCode}:color-mcq`) % MCQ_QUESTIONS.length;
  let shapeIndex = stableHash(`${chitCode}:shape-mcq`) % MCQ_QUESTIONS.length;

  if (MCQ_QUESTIONS.length > 1 && shapeIndex === colorIndex) {
    shapeIndex = (shapeIndex + 1) % MCQ_QUESTIONS.length;
  }

  return {
    color: MCQ_QUESTIONS[colorIndex],
    shape: MCQ_QUESTIONS[shapeIndex],
  };
}