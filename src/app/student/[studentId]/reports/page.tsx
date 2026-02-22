import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import ReportView from "@/components/ReportView";

export default async function StudentReportPage({
  params,
}: {
  params: { studentId: string };
}) {
  const student = await prisma.profile.findUnique({
    where: { id: params.studentId, role: "STUDENT" },
  });
  if (!student) notFound();

  return (
    <main className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      <ReportView
        studentId={params.studentId}
        backHref={`/student/${params.studentId}`}
        backLabel="Back to Dashboard"
      />
    </main>
  );
}
