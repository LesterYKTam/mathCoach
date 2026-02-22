"use client";

import { useRouter } from "next/navigation";

interface ProfileCardProps {
  id: string;
  name: string;
  role: "COACH" | "STUDENT";
}

/**
 * Netflix-style profile card.
 * On click: stores the selected profile in a cookie, then navigates to the
 * appropriate dashboard.
 */
export default function ProfileCard({ id, name, role }: ProfileCardProps) {
  const router = useRouter();
  const isCoach = role === "COACH";

  function handleSelect() {
    // 30-day cookie — no auth, just profile selection
    document.cookie = `profileId=${id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.cookie = `profileRole=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

    if (isCoach) {
      router.push("/coach");
    } else {
      router.push(`/student/${id}`);
    }
  }

  // Avatar initials
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={handleSelect}
      className="group flex flex-col items-center gap-3 focus:outline-none"
      aria-label={`Select profile: ${name} (${isCoach ? "Coach" : "Student"})`}
    >
      {/* Avatar circle */}
      <div
        className={`
          relative flex items-center justify-center
          w-28 h-28 sm:w-36 sm:h-36 rounded-full text-3xl sm:text-4xl font-bold
          border-4 border-transparent
          transition-all duration-200
          group-hover:border-white group-hover:scale-105
          group-focus-visible:border-white group-focus-visible:scale-105
          ${isCoach
            ? "bg-amber-500 text-amber-950"
            : "bg-sky-600 text-white"
          }
        `}
      >
        {initials}
        {/* Coach badge */}
        {isCoach && (
          <span
            className="absolute -top-1 -right-1 bg-amber-300 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            aria-hidden
          >
            COACH
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-sm sm:text-base text-neutral-300 group-hover:text-white transition-colors font-medium">
        {name}
      </span>
    </button>
  );
}
