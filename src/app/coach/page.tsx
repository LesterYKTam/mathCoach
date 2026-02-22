import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/db";
import logger from "@/lib/logger";
import DeactivateButton from "@/components/DeactivateButton";

/**
 * Coach dashboard — shows student roster and active tasks per student.
 * Coach-only page: reads profileId cookie to identify the coach.
 */
export default async function CoachDashboardPage() {
  const cookieStore = cookies();
  const coachId = cookieStore.get("profileId")?.value;
  const role = cookieStore.get("profileRole")?.value;

  if (!coachId || role !== "COACH") notFound();

  // Load all students under this coach, with their active tasks
  const students = await prisma.profile.findMany({
    where: { role: "STUDENT", coachId },
    orderBy: { name: "asc" },
    include: {
      assignedTasks: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, taskType: true, creatorId: true, timeLimit: true, passScore: true, masterScore: true, questions: true },
      },
      // Student's self-created active tasks (creator = student, no assignee)
      createdTasks: {
        where: { isActive: true, assignedToId: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, taskType: true, creatorId: true, timeLimit: true, passScore: true, masterScore: true, questions: true },
      },
    },
  });

  logger.dev(`Coach dashboard loaded — coachId=${coachId}, students=${students.length}`);

  return (
    <main className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Coach Dashboard</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage students and tasks</p>
        </div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          Switch Profile
        </Link>
      </div>

      {students.length === 0 && (
        <p className="text-neutral-500">No students yet. Run the seed to add some.</p>
      )}

      {/* Student cards */}
      <div className="space-y-8">
        {students.map((student) => {
          // Merge assigned + self-created tasks; deduplicate by id
          const taskMap = new Map<string, (typeof student.assignedTasks)[0]>();
          for (const t of [...student.assignedTasks, ...student.createdTasks]) {
            taskMap.set(t.id, t);
          }
          const tasks = Array.from(taskMap.values());

          return (
            <section key={student.id} className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
              {/* Student header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-sm font-bold">
                    {student.name[0].toUpperCase()}
                  </div>
                  <h2 className="text-lg font-semibold">{student.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/coach/reports/${student.id}`}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Reports →
                  </Link>
                  <Link
                    href={`/coach/tasks/new?assignTo=${student.id}`}
                    className="text-xs bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded transition-colors"
                  >
                    + New Task
                  </Link>
                </div>
              </div>

              {/* Task list */}
              {tasks.length === 0 ? (
                <p className="text-neutral-600 text-sm">No active tasks.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => {
                    const questionCount = (() => {
                      try { return (JSON.parse(task.questions) as unknown[]).length; }
                      catch { return "?"; }
                    })();
                    const mins = Math.round(task.timeLimit / 60);

                    return (
                      <li
                        key={task.id}
                        className="flex items-center justify-between text-sm bg-neutral-800 rounded-lg px-4 py-3"
                      >
                        <div>
                          <span className="font-medium">{task.title}</span>
                          <span className="text-neutral-500 ml-3 text-xs">
                            {questionCount} Qs · {mins} min · Master ≥ {task.masterScore}
                          </span>
                        </div>
                        {/* Only creator can deactivate */}
                        {task.creatorId === coachId && (
                          <DeactivateButton taskId={task.id} requesterId={coachId} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
