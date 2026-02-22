import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import ReportView from "@/components/ReportView";

export default async function CoachReportPage({
  params,
}: {
  params: { studentId: string };
}) {
  const cookieStore = cookies();
  const coachId = cookieStore.get("profileId")?.value;
  const role = cookieStore.get("profileRole")?.value;
  if (!coachId || role !== "COACH") notFound();

  // Verify this student belongs to the coach
  const student = await prisma.profile.findUnique({
    where: { id: params.studentId, coachId, role: "STUDENT" },
  });
  if (!student) notFound();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      <ReportView
        studentId={params.studentId}
        backHref="/coach"
        backLabel="Back to Dashboard"
      />
    </main>
  );
}
