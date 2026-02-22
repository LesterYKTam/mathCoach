"use server";

import prisma from "@/lib/db";
import logger from "@/lib/logger";
import { gradeAttempt, type Question } from "@/lib/questionEngine";

export interface SubmitAttemptPayload {
  taskId: string;
  studentId: string;
  startedAt: string;           // ISO string
  timeTaken: number;           // seconds
  /** Map of question id → user answer (null = skipped) */
  answers: Record<string, number | null>;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  total: number;
  grade: "fail" | "pass" | "good" | "master";
  timeTaken: number;
  /** Per-question result rows */
  breakdown: Array<{
    questionIndex: number;
    operand1: number;
    operand2: number;
    correctAnswer: number;
    userAnswer: number | null;
    isCorrect: boolean;
  }>;
}

/**
 * Save a completed (or timed-out) attempt to the database.
 * Returns the graded result for the results screen.
 */
export async function submitAttempt(payload: SubmitAttemptPayload): Promise<AttemptResult> {
  const { taskId, studentId, startedAt, timeTaken, answers } = payload;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const questions: Question[] = JSON.parse(task.questions);

  const { score, total, grade } = gradeAttempt(questions, answers, {
    passScore: task.passScore,
    goodScore: task.goodScore,
    masterScore: task.masterScore,
  });

  // Persist the attempt
  const attempt = await prisma.attempt.create({
    data: {
      taskId,
      studentId,
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      timeTaken,
      score,
      grade,
    },
  });

  // Persist per-question answers
  const answerRows = questions.map((q, idx) => {
    const userAnswer = answers[q.id] ?? null;
    return {
      attemptId: attempt.id,
      questionIndex: idx,
      userAnswer,
      isCorrect: userAnswer !== null && userAnswer === q.answer,
    };
  });

  await prisma.attemptAnswer.createMany({ data: answerRows });

  logger.prd(
    `Attempt saved — attemptId=${attempt.id}, task=${taskId}, student=${studentId}, score=${score}/${total}, grade=${grade}`
  );

  const breakdown = questions.map((q, idx) => ({
    questionIndex: idx,
    operand1: q.operand1,
    operand2: q.operand2,
    correctAnswer: q.answer,
    userAnswer: answers[q.id] ?? null,
    isCorrect: answerRows[idx].isCorrect,
  }));

  return { attemptId: attempt.id, score, total, grade, timeTaken, breakdown };
}
