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
    prompt: "Which signal would a robot trust most during a noisy scan?",
    options: ["The clearest repeated pattern", "The brightest random flash", "The longest shadow", "The first color seen"],
    correctOptionIndex: 0,
  },
  {
    id: "vault-order",
    prompt: "When two clue parts must be combined, what should decide their order?",
    options: ["The instruction order", "The larger number first", "The shorter answer first", "Alphabetical order"],
    correctOptionIndex: 0,
  },
  {
    id: "decoy-rule",
    prompt: "A table has extra entries. Which entries should be used?",
    options: ["Only entries named in the sequence", "Every entry in the table", "Only the last two rows", "Only entries with high digits"],
    correctOptionIndex: 0,
  },
  {
    id: "offset-key",
    prompt: "If a table digit is offset by a chit key, what should you do before using it?",
    options: ["Reverse the offset", "Double the digit", "Ignore the digit", "Swap it with the next row"],
    correctOptionIndex: 0,
  },
  {
    id: "cipher-check",
    prompt: "What is the safest way to handle a solved cipher part?",
    options: ["Keep it visible for the next stage", "Erase it immediately", "Change one digit", "Use only memory"],
    correctOptionIndex: 0,
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
