"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { submitAttempt, type AttemptResult } from "@/app/actions/attempts";
import type { Question } from "@/lib/questionEngine";

type Mode = "train" | "test";

interface AttemptClientProps {
  taskId: string;
  studentId: string;
  questions: Question[];
  timeLimit: number;        // seconds
  layout: "vertical" | "horizontal";
}

/**
 * The live quiz UI — mode selection, count-up timer, question inputs, submit.
 *
 * Train mode: timer counts up past the limit and turns yellow; no auto-submit.
 * Test mode:  timer counts up and auto-submits when the limit is reached.
 */
export default function AttemptClient({
  taskId,
  studentId,
  questions,
  timeLimit,
  layout,
}: AttemptClientProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [overtime, setOvertime] = useState(false);  // train mode: past the limit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const inputRefs      = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs keep values fresh inside setInterval without re-running the effect
  const elapsedRef     = useRef(0);
  const startedAtRef   = useRef("");
  const answersRef     = useRef<Record<string, string>>({});
  const isSubmittingRef = useRef(false);

  // Mirror answers into a ref so the timer callback always sees the latest values
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ── Submit (called by button or auto-submit in test mode)
  const handleSubmit = useCallback(async (auto = false) => {
    if (isSubmittingRef.current || result) return;
    if (timerRef.current) clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const parsedAnswers: Record<string, number | null> = {};
    for (const q of questions) {
      const raw = answersRef.current[q.id]?.trim();
      parsedAnswers[q.id] = raw ? parseInt(raw, 10) : null;
    }

    try {
      const res = await submitAttempt({
        taskId,
        studentId,
        startedAt: startedAtRef.current,
        timeTaken: elapsedRef.current,
        answers: parsedAnswers,
      });
      setResult(res);
    } catch (e) {
      console.error("Submit failed", e);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [result, questions, taskId, studentId]);

  // Keep a ref to handleSubmit so the timer effect doesn't need it as a dep
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // ── Start the quiz when mode is chosen
  function startQuiz(chosen: Mode) {
    startedAtRef.current = new Date().toISOString();
    setMode(chosen);
  }

  // ── Count-up timer — starts once mode is selected
  useEffect(() => {
    if (!mode) return;

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      if (mode === "test" && elapsedRef.current >= timeLimit) {
        clearInterval(timerRef.current!);
        handleSubmitRef.current(true);
        return;
      }
      if (mode === "train" && elapsedRef.current === timeLimit) {
        // Cross the limit — turn yellow but keep ticking
        setOvertime(true);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, timeLimit]); // intentionally exclude handleSubmit — handled via ref

  // ── Format seconds as m:ss
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  // ── Move focus to next input on Enter; submit on last
  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) next.focus();
      else handleSubmit();
    }
  }

  // ─── Pre-start: mode selection ──────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div>
            <h2 className="text-xl font-bold mb-1">Choose Your Mode</h2>
            <p className="text-neutral-400 text-sm">
              Time limit: {formatTime(timeLimit)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Train */}
            <button
              onClick={() => startQuiz("train")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-neutral-800 border-2 border-neutral-700 hover:border-yellow-500 hover:bg-neutral-700 transition-all"
            >
              <span className="text-4xl">🟡</span>
              <span className="font-semibold text-white">Train</span>
              <span className="text-xs text-neutral-400 leading-snug">
                Timer keeps going after time&apos;s up. No pressure.
              </span>
            </button>

            {/* Test */}
            <button
              onClick={() => startQuiz("test")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-neutral-800 border-2 border-neutral-700 hover:border-sky-500 hover:bg-neutral-700 transition-all"
            >
              <span className="text-4xl">🔵</span>
              <span className="font-semibold text-white">Test</span>
              <span className="text-xs text-neutral-400 leading-snug">
                Auto-submits when time runs out.
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Results view ────────────────────────────────────────────────────────────
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
    const pct  = Math.round((result.score / result.total) * 100);

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
            Time: {mins}m {String(secs).padStart(2, "0")}s
            {mode === "train" && result.timeTaken > timeLimit && (
              <span className="ml-2 text-yellow-500">
                (+{formatTime(result.timeTaken - timeLimit)} over limit)
              </span>
            )}
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
              <div className="font-medium">{b.operand1} × {b.operand2}</div>
              <div className="text-xs mt-0.5">
                {b.isCorrect ? (
                  <span>✓ {b.correctAnswer}</span>
                ) : (
                  <span>You: {b.userAnswer ?? "–"} · Ans: {b.correctAnswer}</span>
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

  // ─── Quiz view ───────────────────────────────────────────────────────────────
  // Timer colour logic:
  //   Train + overtime          → yellow (over the limit)
  //   Test  + ≤60s remaining    → red pulse (last minute warning)
  //   Otherwise                 → white
  const timeRemaining = timeLimit - elapsed;
  const timerColor =
    overtime
      ? "text-yellow-400"
      : mode === "test" && timeRemaining <= 60
      ? "text-red-400 animate-pulse"
      : "text-white";

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* Sticky timer + submit bar */}
      <div className="sticky top-0 z-10 bg-neutral-950/90 backdrop-blur flex items-center justify-between py-3 mb-6 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-mono font-bold tabular-nums ${timerColor}`}>
            {formatTime(elapsed)}
          </span>

          {/* Mode badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
            mode === "train"
              ? "bg-yellow-900/40 text-yellow-400 border-yellow-700"
              : "bg-sky-900/40 text-sky-400 border-sky-700"
          }`}>
            {mode === "train" ? "🟡 Train" : "🔵 Test"}
          </span>

          {/* Over-time indicator (train only) */}
          {overtime && (
            <span className="text-xs text-yellow-500 font-mono">
              +{formatTime(elapsed - timeLimit)}
            </span>
          )}
        </div>

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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-neutral-900 rounded-lg p-3 flex flex-col items-end gap-1 border border-neutral-800"
            >
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
                max={225}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-neutral-900 rounded-lg px-4 py-3 flex items-center gap-2 border border-neutral-800"
            >
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
                max={225}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
