import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/db";
import TaskCreationForm from "@/components/task/TaskCreationForm";

/**
 * Coach task creation page — fetches student roster and renders
 * the shared TaskCreationForm with the "assign to student" selector.
 */
export default async function CoachNewTaskPage() {
  const cookieStore = cookies();
  const coachId = cookieStore.get("profileId")?.value;

  if (!coachId) {
    // Not signed in — bounce to profile picker
    notFound();
  }

  // Load all students under this coach
  const students = await prisma.profile.findMany({
    where: { role: "STUDENT", coachId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/coach" className="text-neutral-400 hover:text-white text-sm">
          ← Back to Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-8">Create New Task</h1>

      <TaskCreationForm
        creatorId={coachId}
        creatorRole="COACH"
        students={students}
      />
    </main>
  );
}
