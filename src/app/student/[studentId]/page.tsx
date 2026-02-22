import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import logger from "@/lib/logger";
import DeactivateButton from "@/components/DeactivateButton";

/**
 * Student dashboard — lists active assigned tasks + self-created tasks.
 */
export default async function StudentDashboardPage({
  params,
}: {
  params: { studentId: string };
}) {
  const { studentId } = params;

  const student = await prisma.profile.findUnique({
    where: { id: studentId, role: "STUDENT" },
    include: {
      // Tasks assigned by coach
      assignedTasks: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, creatorId: true, timeLimit: true, passScore: true, goodScore: true, masterScore: true, questions: true },
      },
      // Tasks student created for themselves (no assignee)
      createdTasks: {
        where: { isActive: true, assignedToId: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, creatorId: true, timeLimit: true, passScore: true, goodScore: true, masterScore: true, questions: true },
      },
    },
  });

  if (!student) notFound();

  // Merge assigned + self-created tasks, dedup by id
  const taskMap = new Map<string, (typeof student.assignedTasks)[0]>();
  for (const t of [...student.assignedTasks, ...student.createdTasks]) {
    taskMap.set(t.id, t);
  }
  const tasks = Array.from(taskMap.values());

  logger.dev(`Student dashboard — studentId=${studentId}, tasks=${tasks.length}`);

  return (
    <main className="min-h-screen px-4 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-neutral-400 text-sm mt-1">Your practice tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/student/${studentId}/reports`}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Reports →
          </Link>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white">
            Switch Profile
          </Link>
        </div>
      </div>

      {/* Create own task button */}
      <div className="mb-6">
        <Link
          href={`/student/${studentId}/tasks/new`}
          className="inline-block px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
        >
          + Create My Own Task
        </Link>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="text-lg mb-2">No active tasks yet.</p>
          <p className="text-sm">Your coach will assign tasks, or you can create your own.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const questionCount = (() => {
              try { return (JSON.parse(task.questions) as unknown[]).length; }
              catch { return "?"; }
            })();
            const mins = Math.round(task.timeLimit / 60);

            return (
              <li
                key={task.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base truncate">{task.title}</h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      {questionCount} questions · {mins} min ·{" "}
                      Pass ≥ {task.passScore} · Master ≥ {task.masterScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {task.creatorId === studentId && (
                      <DeactivateButton taskId={task.id} requesterId={studentId} />
                    )}
                    <Link
                      href={`/student/${studentId}/tasks/${task.id}`}
                      className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
                    >
                      Start →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
