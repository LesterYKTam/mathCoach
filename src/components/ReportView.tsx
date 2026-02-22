import prisma from "@/lib/db";
import ScoreTrendChart from "./ScoreTrendChart";
import logger from "@/lib/logger";

interface ReportViewProps {
  studentId: string;
  /** If provided, filter to a single task. */
  filterTaskId?: string;
  backHref: string;
  backLabel: string;
}

const GRADE_BADGE: Record<string, string> = {
  master: "bg-yellow-700 text-yellow-100",
  good:   "bg-sky-700 text-sky-100",
  pass:   "bg-green-800 text-green-100",
  fail:   "bg-red-900 text-red-200",
};
const GRADE_LABEL: Record<string, string> = {
  master: "🏆 Master",
  good:   "🔵 Good",
  pass:   "🟡 Pass",
  fail:   "✗ Fail",
};

/**
 * Server component that renders the full report for a student.
 * Shared by coach (/coach/reports/[studentId]) and student (/student/[id]/reports).
 */
export default async function ReportView({
  studentId,
  filterTaskId,
  backHref,
  backLabel,
}: ReportViewProps) {
  const student = await prisma.profile.findUnique({ where: { id: studentId } });
  if (!student) return <p className="text-neutral-500">Student not found.</p>;

  // Load all tasks the student has attempts on
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assignedToId: studentId },
        { creatorId: studentId, assignedToId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, passScore: true, goodScore: true, masterScore: true, questions: true },
  });

  // Load attempts (filtered if requested)
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId,
      completedAt: { not: null },
      ...(filterTaskId ? { taskId: filterTaskId } : {}),
    },
    orderBy: { startedAt: "asc" },
    include: { task: { select: { title: true, passScore: true, goodScore: true, masterScore: true, questions: true } } },
  });

  logger.dev(`Report loaded — student=${studentId}, attempts=${attempts.length}`);

  // Group attempts by task for chart data
  const attemptsByTask = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByTask.get(a.taskId) ?? [];
    list.push(a);
    attemptsByTask.set(a.taskId, list);
  }

  const displayTasks = filterTaskId
    ? tasks.filter((t) => t.id === filterTaskId)
    : tasks;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <a href={backHref} className="text-sm text-neutral-400 hover:text-white">
          ← {backLabel}
        </a>
        <h1 className="text-2xl font-bold">{student.name} — Reports</h1>
      </div>

      {displayTasks.length === 0 && (
        <p className="text-neutral-500">No tasks with recorded attempts yet.</p>
      )}

      {displayTasks.map((task) => {
        const taskAttempts = attemptsByTask.get(task.id) ?? [];

        // Build chart data
        const chartData = taskAttempts.map((a, i) => {
          const total = (() => {
            try { return (JSON.parse(a.task.questions) as unknown[]).length; }
            catch { return 1; }
          })();
          return {
            attempt: i + 1,
            date: new Date(a.startedAt).toLocaleDateString(),
            scorePct: Math.round(((a.score ?? 0) / total) * 100),
          };
        });

        const total = (() => {
          try { return (JSON.parse(task.questions) as unknown[]).length; }
          catch { return 1; }
        })();

        return (
          <section key={task.id} className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h2 className="text-lg font-semibold mb-4">{task.title}</h2>

            {/* Trend chart */}
            {chartData.length > 0 && (
              <div className="mb-5">
                <ScoreTrendChart
                  data={chartData}
                  passThreshold={Math.round((task.passScore / total) * 100)}
                  goodThreshold={Math.round((task.goodScore / total) * 100)}
                  masterThreshold={Math.round((task.masterScore / total) * 100)}
                />
              </div>
            )}

            {/* Attempt history table */}
            {taskAttempts.length === 0 ? (
              <p className="text-neutral-600 text-sm">No attempts recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {taskAttempts.map((a, i) => {
                    const mins = Math.floor((a.timeTaken ?? 0) / 60);
                    const secs = (a.timeTaken ?? 0) % 60;
                    const grade = a.grade ?? "fail";
                    return (
                      <tr key={a.id} className="border-b border-neutral-800/50">
                        <td className="py-2 pr-4 text-neutral-500">{i + 1}</td>
                        <td className="py-2 pr-4">
                          {new Date(a.startedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {mins}m {String(secs).padStart(2, "0")}s
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {a.score ?? 0} / {total}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${GRADE_BADGE[grade]}`}>
                            {GRADE_LABEL[grade]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
