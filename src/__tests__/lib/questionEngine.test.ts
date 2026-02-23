/**
 * Unit tests for src/lib/questionEngine.ts
 *
 * Covers:
 *   - shuffleArray
 *   - generateMultiplicationQuestions
 *   - shuffleQuestions
 *   - gradeAttempt
 */

import { describe, it, expect, vi } from "vitest";
import logger from "@/lib/logger";
import {
  shuffleArray,
  generateMultiplicationQuestions,
  shuffleQuestions,
  gradeAttempt,
  type Fact,
  type Question,
} from "@/lib/questionEngine";

// ─── shuffleArray ────────────────────────────────────────────────────────────

describe("shuffleArray", () => {
  it("returns an array of the same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffleArray([...arr]);
    expect(result).toHaveLength(arr.length);
    logger.test("shuffleArray: length preserved");
  });

  it("contains all original elements after shuffle", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffleArray([...arr]);
    expect(result.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b));
    logger.test("shuffleArray: all elements preserved");
  });

  it("handles a single-element array", () => {
    expect(shuffleArray([42])).toEqual([42]);
    logger.test("shuffleArray: single element edge case");
  });

  it("handles an empty array", () => {
    expect(shuffleArray([])).toEqual([]);
    logger.test("shuffleArray: empty array edge case");
  });

  it("mutates the input array in place and returns it", () => {
    const arr = [1, 2, 3];
    const result = shuffleArray(arr);
    // Same reference — in-place
    expect(result).toBe(arr);
    logger.test("shuffleArray: returns same array reference");
  });
});

// ─── generateMultiplicationQuestions ────────────────────────────────────────

describe("generateMultiplicationQuestions", () => {
  const facts: Fact[] = [[3, 4], [5, 6], [7, 8]];

  it("returns exactly `count` questions", () => {
    const qs = generateMultiplicationQuestions(facts, 10);
    expect(qs).toHaveLength(10);
    logger.test("generateMultiplicationQuestions: returns correct count");
  });

  it("every question has the correct answer (operand1 × operand2)", () => {
    const qs = generateMultiplicationQuestions(facts, 50);
    for (const q of qs) {
      expect(q.answer).toBe(q.operand1 * q.operand2);
    }
    logger.test("generateMultiplicationQuestions: all answers correct");
  });

  it("only uses facts from the selectedFacts list", () => {
    const qs = generateMultiplicationQuestions(facts, 50);
    for (const q of qs) {
      const match = facts.some(
        ([a, b]) =>
          (q.operand1 === a && q.operand2 === b) ||
          (q.operand1 === b && q.operand2 === a)
      );
      expect(match).toBe(true);
    }
    logger.test("generateMultiplicationQuestions: only uses selected facts");
  });

  it("assigns unique ids q0, q1, ... qN-1", () => {
    const qs = generateMultiplicationQuestions(facts, 5);
    const ids = qs.map((q) => q.id);
    // IDs are assigned before shuffle so q0..q4 must all be present
    expect(ids.sort()).toEqual(["q0", "q1", "q2", "q3", "q4"]);
    logger.test("generateMultiplicationQuestions: unique sequential ids");
  });

  it("works with a single fact (samples with replacement)", () => {
    const qs = generateMultiplicationQuestions([[9, 9]], 25);
    expect(qs).toHaveLength(25);
    expect(qs.every((q) => q.answer === 81)).toBe(true);
    logger.test("generateMultiplicationQuestions: single fact with replacement");
  });

  it("handles count of 1", () => {
    const qs = generateMultiplicationQuestions(facts, 1);
    expect(qs).toHaveLength(1);
    logger.test("generateMultiplicationQuestions: count=1 edge case");
  });

  it("throws when selectedFacts is empty", () => {
    expect(() => generateMultiplicationQuestions([], 10)).toThrow(
      "selectedFacts must not be empty"
    );
    logger.test("generateMultiplicationQuestions: throws on empty facts");
  });

  it("throws when count is less than 1", () => {
    expect(() => generateMultiplicationQuestions(facts, 0)).toThrow(
      "count must be at least 1"
    );
    logger.test("generateMultiplicationQuestions: throws on count < 1");
  });
});

// ─── shuffleQuestions ────────────────────────────────────────────────────────

describe("shuffleQuestions", () => {
  const makeQuestions = (): Question[] =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `q${i}`,
      operand1: i + 1,
      operand2: i + 2,
      answer: (i + 1) * (i + 2),
    }));

  it("returns a new array (does not mutate input)", () => {
    const original = makeQuestions();
    const copy = [...original];
    const result = shuffleQuestions(original);
    // Input unchanged
    expect(original).toEqual(copy);
    // Result is a different reference
    expect(result).not.toBe(original);
    logger.test("shuffleQuestions: does not mutate input");
  });

  it("returns same length and same elements", () => {
    const original = makeQuestions();
    const result = shuffleQuestions(original);
    expect(result).toHaveLength(original.length);
    expect(result.map((q) => q.id).sort()).toEqual(
      original.map((q) => q.id).sort()
    );
    logger.test("shuffleQuestions: same elements after shuffle");
  });

  it("handles an empty question array", () => {
    expect(shuffleQuestions([])).toEqual([]);
    logger.test("shuffleQuestions: empty array edge case");
  });
});

// ─── gradeAttempt ────────────────────────────────────────────────────────────

describe("gradeAttempt", () => {
  // 10 questions: q0..q9, answers are q.index * 2 (0, 2, 4, ..., 18)
  const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
    operand1: i,
    operand2: 2,
    answer: i * 2,
  }));

  const thresholds = { passScore: 5, goodScore: 7, masterScore: 10 };

  /** Build an answers map: first `correct` questions answered correctly, rest skipped. */
  function makeAnswers(correct: number): Record<string, number | null> {
    const answers: Record<string, number | null> = {};
    for (let i = 0; i < 10; i++) {
      answers[`q${i}`] = i < correct ? questions[i].answer : null;
    }
    return answers;
  }

  it("scores 10/10 as 'master'", () => {
    const result = gradeAttempt(questions, makeAnswers(10), thresholds);
    expect(result.score).toBe(10);
    expect(result.grade).toBe("master");
    logger.test("gradeAttempt: 10/10 → master");
  });

  it("scores 7/10 as 'good'", () => {
    const result = gradeAttempt(questions, makeAnswers(7), thresholds);
    expect(result.score).toBe(7);
    expect(result.grade).toBe("good");
    logger.test("gradeAttempt: 7/10 → good");
  });

  it("scores exactly at goodScore threshold (not master) as 'good'", () => {
    // goodScore = 7, masterScore = 10 → 7 correct = good (not master)
    const result = gradeAttempt(questions, makeAnswers(7), thresholds);
    expect(result.grade).toBe("good");
    logger.test("gradeAttempt: exactly at goodScore → good");
  });

  it("scores 5/10 as 'pass'", () => {
    const result = gradeAttempt(questions, makeAnswers(5), thresholds);
    expect(result.score).toBe(5);
    expect(result.grade).toBe("pass");
    logger.test("gradeAttempt: 5/10 → pass");
  });

  it("scores 4/10 as 'fail'", () => {
    const result = gradeAttempt(questions, makeAnswers(4), thresholds);
    expect(result.score).toBe(4);
    expect(result.grade).toBe("fail");
    logger.test("gradeAttempt: 4/10 → fail");
  });

  it("scores 0/10 (all skipped) as 'fail'", () => {
    const result = gradeAttempt(questions, makeAnswers(0), thresholds);
    expect(result.score).toBe(0);
    expect(result.grade).toBe("fail");
    logger.test("gradeAttempt: 0/10 (all skipped) → fail");
  });

  it("returns correct total", () => {
    const result = gradeAttempt(questions, makeAnswers(5), thresholds);
    expect(result.total).toBe(10);
    logger.test("gradeAttempt: total matches question count");
  });

  it("does not count wrong answers as correct", () => {
    // All answers set to -1 (wrong), none are correct
    const answers: Record<string, number | null> = {};
    questions.forEach((q) => { answers[q.id] = -1; });
    const result = gradeAttempt(questions, answers, thresholds);
    expect(result.score).toBe(0);
    logger.test("gradeAttempt: wrong answers not counted");
  });

  it("handles undefined answers (missing key) as incorrect", () => {
    // Empty answers map — no keys at all
    const result = gradeAttempt(questions, {}, thresholds);
    expect(result.score).toBe(0);
    logger.test("gradeAttempt: missing answer keys treated as incorrect");
  });

  it("scores 8/10 as 'good' (between goodScore and masterScore)", () => {
    const result = gradeAttempt(questions, makeAnswers(8), thresholds);
    expect(result.grade).toBe("good");
    logger.test("gradeAttempt: 8/10 between good/master thresholds → good");
  });
});
