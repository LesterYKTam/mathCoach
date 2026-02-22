import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import TaskCreationForm from "@/components/task/TaskCreationForm";

/**
 * Student task creation page — student creates their own task.
 * No assignment selector; the task belongs to the student.
 */
export default async function StudentNewTaskPage({
  params,
}: {
  params: { studentId: string };
}) {
  const { studentId } = params;

  const student = await prisma.profile.findUnique({
    where: { id: studentId, role: "STUDENT" },
  });

  if (!student) notFound();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/student/${studentId}`}
          className="text-neutral-400 hover:text-white text-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-8">Create My Own Task</h1>

      <TaskCreationForm
        creatorId={studentId}
        creatorRole="STUDENT"
      />
    </main>
  );
}
