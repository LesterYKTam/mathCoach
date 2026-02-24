"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import logger from "@/lib/logger";
import type { Fact, Question } from "@/lib/questionEngine";

export interface CreateTaskPayload {
  title: string;
  creatorId: string;
  /**
   * IDs of students to assign this task to.
   * Coach: one task record is created per student (same questions/config, independent histories).
   * Empty array or student role: creates a single unassigned (self-created) task.
   */
  assignedToIds: string[];
  timeLimit: number;       // seconds
  passScore: number;
  goodScore: number;
  masterScore: number;
  questions: Question[];
  config: {
    selectedFacts: Fact[];
    questionCount: number;
    layout: "vertical" | "horizontal";
  };
}

/**
 * Persist a new task + its fixed question set to the database.
 * When assignedToIds has multiple entries, one task record is created per student
 * so each student gets an independent copy (own attempts, own deactivate).
 * Redirects to the creator's dashboard after saving.
 */
export async function createTask(payload: CreateTaskPayload): Promise<void> {
  const {
    title, creatorId, assignedToIds,
    timeLimit, passScore, goodScore, masterScore,
    questions, config,
  } = payload;

  if (!title.trim()) throw new Error("Task title is required");
  if (questions.length === 0) throw new Error("Task must have at least one question");

  const questionsJson = JSON.stringify(questions);
  const configJson    = JSON.stringify(config);
  const titleTrimmed  = title.trim();

  if (assignedToIds.length === 0) {
    // Self-created task (student role, or coach with no assignees selected)
    const task = await prisma.task.create({
      data: {
        title: titleTrimmed, creatorId, assignedToId: null,
        taskType: "multiplication", timeLimit, passScore, goodScore, masterScore,
        questions: questionsJson, config: configJson,
      },
    });
    logger.prd(`Task created — id=${task.id}, creator=${creatorId}, assignedTo=self, questions=${questions.length}`);
  } else {
    // Create one task record per assigned student (same content, independent records)
    for (const studentId of assignedToIds) {
      const task = await prisma.task.create({
        data: {
          title: titleTrimmed, creatorId, assignedToId: studentId,
          taskType: "multiplication", timeLimit, passScore, goodScore, masterScore,
          questions: questionsJson, config: configJson,
        },
      });
      logger.prd(`Task created — id=${task.id}, creator=${creatorId}, assignedTo=${studentId}, questions=${questions.length}`);
    }
  }

  // Redirect to the appropriate dashboard
  const creator = await prisma.profile.findUnique({ where: { id: creatorId } });
  if (creator?.role === "COACH") {
    redirect("/coach");
  } else {
    redirect(`/student/${creatorId}`);
  }
}

/**
 * Soft-deactivate a task (creator only).
 */
export async function deactivateTask(taskId: string, requesterId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.creatorId !== requesterId) throw new Error("Only the creator can deactivate a task");

  await prisma.task.update({ where: { id: taskId }, data: { isActive: false } });
  logger.prd(`Task deactivated — id=${taskId}, by=${requesterId}`);
}
