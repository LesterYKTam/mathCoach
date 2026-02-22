/**
 * Question Engine — pure, unit-testable functions, no DB dependency.
 *
 * Phase 1 scope: single-digit multiplication (factors 0–9 × 0–9).
 *
 * Types:
 *   Fact     — [a, b] pair, e.g. [3, 7]
 *   Question — one generated question with operands + correct answer
 *   Grade    — result tier after an attempt
 */

export type Fact = [number, number];

export interface Question {
  id: string;        // unique within the question set
  operand1: number;
  operand2: number;
  answer: number;
}

export type Grade = "fail" | "pass" | "good" | "master";

export interface GradeResult {
  score: number;   // number of correct answers
  total: number;
  grade: Grade;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle. Returns the same array for convenience. */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Randomly draw `count` questions from the provided multiplication fact pairs.
 * Facts are sampled with replacement so rare/large sets still fill any count.
 *
 * @param selectedFacts  Array of [a, b] pairs to draw from. Must be non-empty.
 * @param count          Number of questions to generate (≥ 1).
 * @returns              Shuffled array of Question objects, length === count.
 */
export function generateMultiplicationQuestions(
  selectedFacts: Fact[],
  count: number
): Question[] {
  if (selectedFacts.length === 0) {
    throw new Error("generateMultiplicationQuestions: selectedFacts must not be empty");
  }
  if (count < 1) {
    throw new Error("generateMultiplicationQuestions: count must be at least 1");
  }

  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    // Pick a random fact; sample with replacement so any count is achievable
    const [a, b] = selectedFacts[Math.floor(Math.random() * selectedFacts.length)];
    questions.push({
      id: `q${i}`,
      operand1: a,
      operand2: b,
      answer: a * b,
    });
  }

  // Shuffle so identical consecutive facts are spread out
  return shuffleArray(questions);
}

/**
 * Re-shuffle an existing question set without changing the questions themselves.
 * Used for the "Regenerate" button when the user wants a different ordering
 * without altering which facts are included.
 */
export function shuffleQuestions(questions: Question[]): Question[] {
  return shuffleArray([...questions]);
}

/**
 * Grade a completed attempt.
 *
 * @param questions   The fixed question set for the task.
 * @param answers     Map of question id → user's numeric answer (null = skipped).
 * @param thresholds  { passScore, goodScore, masterScore } — absolute correct counts.
 */
export function gradeAttempt(
  questions: Question[],
  answers: Record<string, number | null>,
  thresholds: { passScore: number; goodScore: number; masterScore: number }
): GradeResult {
  const total = questions.length;
  let score = 0;

  for (const q of questions) {
    const userAnswer = answers[q.id];
    if (userAnswer !== null && userAnswer !== undefined && userAnswer === q.answer) {
      score++;
    }
  }

  let grade: Grade;
  if (score >= thresholds.masterScore) {
    grade = "master";
  } else if (score >= thresholds.goodScore) {
    grade = "good";
  } else if (score >= thresholds.passScore) {
    grade = "pass";
  } else {
    grade = "fail";
  }

  return { score, total, grade };
}
