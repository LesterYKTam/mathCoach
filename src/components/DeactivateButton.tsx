"use client";

import { useTransition } from "react";
import { deactivateTask } from "@/app/actions/tasks";
import { useRouter } from "next/navigation";

interface DeactivateButtonProps {
  taskId: string;
  requesterId: string;
}

/**
 * Soft-deactivate button — only rendered for the task creator.
 * Calls the server action then refreshes the page.
 */
export default function DeactivateButton({ taskId, requesterId }: DeactivateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Deactivate this task? It will be hidden from the task list but kept in reports.")) return;
    startTransition(async () => {
      await deactivateTask(taskId, requesterId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-neutral-500 hover:text-red-400 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Deactivating…" : "Deactivate"}
    </button>
  );
}
