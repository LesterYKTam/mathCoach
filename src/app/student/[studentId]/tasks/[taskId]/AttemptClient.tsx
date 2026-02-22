"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { submitAttempt, type AttemptResult } from "@/app/actions/attempts";
import type { Question } from "@/lib/questionEngine";

interface AttemptClientProps {
  taskId: string;
  studentId: string;
  questions: Question[];
  timeLimit: number;        // seconds
  layout: "vertical" | "horizontal";
}

/**
 * The live quiz UI — countdown timer, question inputs, submit.
 * On submit (manual or timer expiry) calls the server action and
 * transitions to the results view.
 */
export default function AttemptClient({
  taskId,
  studentId,
  questions,
  timeLimit,
  layout,
}: AttemptClientProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startedAt] = useState(() => new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Submit handler (used by button and auto-submit on timer end)
  const handleSubmit = useCallback(
    async (auto = false) => {
      if (isSubmitting || result) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setIsSubmitting(true);

      const timeTaken = timeLimit - timeLeft;
      const parsedAnswers: Record<string, number | null> = {};
      for (const q of questions) {
        const raw = answers[q.id]?.trim();
        parsedAnswers[q.id] = raw ? parseInt(raw, 10) : null;
      }

      try {
        const res = await submitAttempt({
          taskId,
          studentId,
          startedAt,
          timeTaken,
          answers: parsedAnswers,
        });
        setResult(res);
      } catch (e) {
        console.error("Submit failed", e);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, result, timeLimit, timeLeft, questions, answers, taskId, studentId, startedAt]
  );

  // ── Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [handleSubmit]);

  // ── Format timer display
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  // ── Move focus to next input on Enter
  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) next.focus();
      else handleSubmit();
    }
  }

  // ─── Results view ───────────────────────────────────────────────────────────
  if (result) {
    const gradeColors: Record<string, string> = {
      master: "text-yellow-400",
      good:   "text-sky-400",
      pass:   "text-green-400",
      fail:   "text-red-400",
    };
    const gradeLabels: Record<string, string> = {
      master: "🏆 Master",
      good:   "🔵 Good",
      pass:   "🟡 Pass",
      fail:   "✗ Not Yet",
    };
    const mins = Math.floor(result.timeTaken / 60);
    const secs = result.timeTaken % 60;
    const pct = Math.round((result.score / result.total) * 100);

    return (
      <div className="min-h-screen px-4 py-10 max-w-3xl mx-auto">
        {/* Grade banner */}
        <div className="text-center mb-10">
          <p className={`text-5xl font-black mb-2 ${gradeColors[result.grade]}`}>
            {gradeLabels[result.grade]}
          </p>
          <p className="text-3xl font-bold">
            {result.score} / {result.total}
            <span className="text-neutral-400 text-lg ml-2">({pct}%)</span>
          </p>
          <p className="text-neutral-500 text-sm mt-2">
            Time taken: {mins}m {String(secs).padStart(2, "0")}s
          </p>
        </div>

        {/* Per-question breakdown */}
        <h2 className="text-sm font-medium text-neutral-400 mb-3">Question Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-8">
          {result.breakdown.map((b) => (
            <div
              key={b.questionIndex}
              className={`rounded-lg p-3 text-sm border ${
                b.isCorrect
                  ? "bg-green-900/30 border-green-800 text-green-300"
                  : "bg-red-900/30 border-red-800 text-red-300"
              }`}
            >
              <div className="font-medium">
                {b.operand1} × {b.operand2}
              </div>
              <div className="text-xs mt-0.5">
                {b.isCorrect ? (
                  <span>✓ {b.correctAnswer}</span>
                ) : (
                  <span>
                    You: {b.userAnswer ?? "–"} · Ans: {b.correctAnswer}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={`/student/${studentId}/tasks/${taskId}`}
            className="px-5 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium"
          >
            Try Again
          </a>
          <a
            href={`/student/${studentId}`}
            className="px-5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ─── Quiz view ──────────────────────────────────────────────────────────────
  const timerWarning = timeLeft <= 60;

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* Sticky timer + submit bar */}
      <div className="sticky top-0 z-10 bg-neutral-950/90 backdrop-blur flex items-center justify-between py-3 mb-6 border-b border-neutral-800">
        <span
          className={`text-2xl font-mono font-bold tabular-nums ${
            timerWarning ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {formatTime(timeLeft)}
        </span>
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {isSubmitting ? "Saving…" : "Submit"}
        </button>
      </div>

      {/* Questions */}
      {layout === "vertical" ? (
        // Vertical layout — column arithmetic style
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-neutral-900 rounded-lg p-3 flex flex-col items-end gap-1 border border-neutral-800">
              <span className="text-sm tabular-nums">{q.operand1}</span>
              <span className="text-sm tabular-nums">× {q.operand2}</span>
              <div className="w-full border-t border-neutral-600 my-1" />
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="number"
                inputMode="numeric"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-full bg-transparent text-right text-sm font-bold text-sky-300 focus:outline-none placeholder-neutral-700"
                placeholder="?"
                min={0}
                max={81}
              />
            </div>
          ))}
        </div>
      ) : (
        // Horizontal layout — inline style
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-neutral-900 rounded-lg px-4 py-3 flex items-center gap-2 border border-neutral-800">
              <span className="text-sm tabular-nums whitespace-nowrap">
                {q.operand1} × {q.operand2} =
              </span>
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="number"
                inputMode="numeric"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-20 bg-neutral-800 rounded px-2 py-1 text-sm font-bold text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-600 text-center"
                placeholder="?"
                min={0}
                max={81}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
