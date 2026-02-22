import prisma from "@/lib/db";
import ProfileCard from "@/components/ProfileCard";
import logger from "@/lib/logger";

/**
 * Profile picker — the app entry point.
 * Netflix-style grid: one coach card + all student cards.
 * Clicking a card stores the selection in a cookie and redirects.
 */
export default async function ProfilePickerPage() {
  const profiles = await prisma.profile.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  logger.dev(`Profile picker loaded — ${profiles.length} profiles`);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
          Math Coach
        </h1>
        <p className="text-neutral-400 text-sm sm:text-base">
          Who&apos;s practising today?
        </p>
      </div>

      {/* Profile grid */}
      <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            id={profile.id}
            name={profile.name}
            role={profile.role as "COACH" | "STUDENT"}
          />
        ))}
      </div>

      {profiles.length === 0 && (
        <p className="text-neutral-500 text-sm">
          No profiles found. Run <code className="bg-neutral-800 px-1 rounded">npm run db:seed</code> to create some.
        </p>
      )}
    </main>
  );
}
