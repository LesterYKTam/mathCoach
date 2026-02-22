import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import logger from "@/lib/logger";
import AttemptClient from "./AttemptClient";
import type { Question } from "@/lib/questionEngine";

/**
 * Task attempt page — server component that loads the task and passes
 * the fixed questions to the client-side AttemptClient.
 */
export default async function TaskAttemptPage({
  params,
}: {
  params: { studentId: string; taskId: string };
}) {
  const { studentId, taskId } = params;

  // Verify student exists
  const student = await prisma.profile.findUnique({
    where: { id: studentId, role: "STUDENT" },
  });
  if (!student) notFound();

  // Load task — must be active
  const task = await prisma.task.findUnique({ where: { id: taskId, isActive: true } });
  if (!task) notFound();

  // Verify student has access (assigned to them or self-created)
  const hasAccess =
    task.assignedToId === studentId ||
    (task.creatorId === studentId && task.assignedToId === null);
  if (!hasAccess) notFound();

  const questions: Question[] = JSON.parse(task.questions);
  const config = JSON.parse(task.config) as { layout: "vertical" | "horizontal" };

  logger.dev(`Task attempt started — taskId=${taskId}, studentId=${studentId}, questions=${questions.length}`);

  return (
    <div className="bg-neutral-950 min-h-screen">
      {/* Task header */}
      <header className="px-4 py-4 border-b border-neutral-800">
        <h1 className="text-base font-semibold">{task.title}</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {questions.length} questions · {Math.round(task.timeLimit / 60)} min
        </p>
      </header>

      <AttemptClient
        taskId={taskId}
        studentId={studentId}
        questions={questions}
        timeLimit={task.timeLimit}
        layout={config.layout ?? "vertical"}
      />
    </div>
  );
}
