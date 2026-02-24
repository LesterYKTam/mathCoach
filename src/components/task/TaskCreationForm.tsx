"use client";

import { useState, useTransition } from "react";
import MultiplicationGrid, { selectedToFacts } from "./MultiplicationGrid";
import { generateMultiplicationQuestions, type Question } from "@/lib/questionEngine";
import { createTask } from "@/app/actions/tasks";
import logger from "@/lib/logger";

interface StudentOption {
  id: string;
  name: string;
}

interface TaskCreationFormProps {
  creatorId: string;
  creatorRole: "COACH" | "STUDENT";
  /** Students the coach can assign to. Empty for student role. */
  students?: StudentOption[];
}

const QUESTION_COUNT_PRESETS = [30, 60, 90];
const DEFAULT_COUNT = 60;
const DEFAULT_TIME = 600; // 10 minutes in seconds

/**
 * Shared task creation form used by both coach and student.
 * Manages grid selection, config, question preview, and save.
 */
export default function TaskCreationForm({
  creatorId,
  creatorRole,
  students = [],
}: TaskCreationFormProps) {
  // ── Grid selection
  const [selected, setSelected] = useState<Set<string>>(() => {
    // Default: all 1–15 × 1–15 facts
    const s = new Set<string>();
    for (let a = 1; a <= 15; a++)
      for (let b = 1; b <= 15; b++)
        s.add(`${a},${b}`);
    return s;
  });

  // ── Config
  const [questionCount, setQuestionCount] = useState(DEFAULT_COUNT);
  const [customCount, setCustomCount] = useState(false);
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME);
  const [passScore, setPassScore] = useState(Math.round(DEFAULT_COUNT * 0.75));
  const [goodScore, setGoodScore] = useState(Math.round(DEFAULT_COUNT * 0.9));
  const [masterScore, setMasterScore] = useState(DEFAULT_COUNT);
  const [title, setTitle] = useState("");
  // Coach multi-assign: set of selected student IDs
  const [assignedToIds, setAssignedToIds] = useState<Set<string>>(
    () => new Set(creatorRole === "COACH" ? students.map((s) => s.id) : [])
  );

  // ── Generated questions (preview)
  const [questions, setQuestions] = useState<Question[]>(() => {
    // Initialise with all 1–15 × 1–15 facts (225 total)
    const facts = selectedToFacts(new Set(
      Array.from({ length: 225 }, (_, i) => `${Math.floor(i / 15) + 1},${(i % 15) + 1}`)
    ));
    return generateMultiplicationQuestions(facts, DEFAULT_COUNT);
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Question count helpers
  function applyCount(count: number) {
    setQuestionCount(count);
    // Keep score thresholds proportional
    setPassScore(Math.round(count * 0.75));
    setGoodScore(Math.round(count * 0.9));
    setMasterScore(count);
  }

  // ── Regenerate questions from current selection + count
  function regenerate() {
    const facts = selectedToFacts(selected);
    if (facts.length === 0) {
      setError("Select at least one multiplication fact first.");
      return;
    }
    setError(null);
    const qs = generateMultiplicationQuestions(facts, questionCount);
    setQuestions(qs);
    logger.dev(`Questions regenerated — ${qs.length} questions from ${facts.length} facts`);
  }

  // ── Save
  function handleSave() {
    if (!title.trim()) { setError("Please enter a task title."); return; }
    if (selected.size === 0) { setError("Select at least one multiplication fact."); return; }
    if (passScore > goodScore || goodScore > masterScore) {
      setError("Thresholds must be: Pass ≤ Good ≤ Master.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        await createTask({
          title,
          creatorId,
          assignedToIds: creatorRole === "COACH" ? Array.from(assignedToIds) : [],
          timeLimit,
          passScore,
          goodScore,
          masterScore,
          questions,
          config: {
            selectedFacts: selectedToFacts(selected),
            questionCount,
            layout,
          },
        });
      } catch (e: unknown) {
        // redirect() throws an internal Next.js error — ignore it
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) {
          setError(msg);
        }
      }
    });
  }

  // ── Time display helper
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec === 0 ? `${m} min` : `${m}m ${sec}s`;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Task Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Times Tables Practice"
          className="w-full max-w-md rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
      </div>

      {/* Coach-only: assign to one or more students */}
      {creatorRole === "COACH" && students.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <label className="block text-sm font-medium text-neutral-300">
              Assign To
            </label>
            {/* Quick-select helpers */}
            <button
              type="button"
              onClick={() => setAssignedToIds(new Set(students.map((s) => s.id)))}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              All
            </button>
            <span className="text-neutral-600 text-xs">·</span>
            <button
              type="button"
              onClick={() => setAssignedToIds(new Set())}
              className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              None
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {students.map((s) => {
              const checked = assignedToIds.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? "bg-sky-900/40 border-sky-700 text-white"
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setAssignedToIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      });
                    }}
                    className="accent-sky-500 w-4 h-4"
                  />
                  <div className="w-7 h-7 rounded-full bg-sky-700 flex items-center justify-center text-xs font-bold text-white">
                    {s.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{s.name}</span>
                </label>
              );
            })}
          </div>
          {assignedToIds.size === 0 && (
            <p className="text-xs text-amber-400 mt-2">
              No students selected — task will be saved without assignment.
            </p>
          )}
          {assignedToIds.size > 1 && (
            <p className="text-xs text-sky-400 mt-2">
              {assignedToIds.size} students selected — one task copy per student.
            </p>
          )}
        </div>
      )}

      {/* Multiplication grid */}
      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">
          Select Multiplication Facts
        </h2>
        <MultiplicationGrid selected={selected} onChange={setSelected} />
      </div>

      {/* Question count */}
      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">Number of Questions</h2>
        <div className="flex flex-wrap items-center gap-2">
          {QUESTION_COUNT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setCustomCount(false); applyCount(n); }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                !customCount && questionCount === n
                  ? "bg-sky-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomCount(true)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              customCount
                ? "bg-sky-600 text-white"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            Custom
          </button>
        </div>

        {customCount && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={20}
              max={100}
              value={questionCount}
              onChange={(e) => applyCount(Number(e.target.value))}
              className="w-48 accent-sky-500"
            />
            <span className="text-sm text-neutral-300 w-16">{questionCount} Qs</span>
          </div>
        )}
      </div>

      {/* Layout */}
      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">Question Layout</h2>
        <div className="flex gap-3">
          {(["vertical", "horizontal"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize transition-colors ${
                layout === l
                  ? "bg-sky-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          {layout === "vertical"
            ? "Questions displayed as column arithmetic (e.g. 7 × 8 = __)"
            : "Questions displayed inline (e.g. 7 × 8 = __)"}
        </p>
      </div>

      {/* Time limit */}
      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-2">
          Time Limit — {formatTime(timeLimit)}
        </h2>
        <input
          type="range"
          min={60}
          max={1800}
          step={30}
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          className="w-64 accent-sky-500"
        />
        <div className="flex justify-between text-xs text-neutral-500 w-64 mt-0.5">
          <span>1 min</span>
          <span>30 min</span>
        </div>
      </div>

      {/* Score thresholds */}
      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">
          Passing Thresholds (out of {questionCount} questions)
        </h2>
        <div className="grid grid-cols-3 gap-4 max-w-sm">
          {(
            [
              { label: "🟡 Pass",   key: "pass",   value: passScore,   set: setPassScore },
              { label: "🔵 Good",   key: "good",   value: goodScore,   set: setGoodScore },
              { label: "🏆 Master", key: "master", value: masterScore, set: setMasterScore },
            ] as const
          ).map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-neutral-400 mb-1">{label}</label>
              <input
                type="number"
                min={0}
                max={questionCount}
                value={value}
                onChange={(e) => set(Math.min(questionCount, Math.max(0, Number(e.target.value))))}
                className="w-full rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Question preview + Regenerate */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium text-neutral-300">
            Question Preview ({questions.length} questions)
          </h2>
          <button
            type="button"
            onClick={regenerate}
            className="text-xs px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
          >
            ↻ Regenerate
          </button>
        </div>

        {/* Show first 20 questions as a preview */}
        <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-neutral-900 rounded border border-neutral-800`}>
          {questions.slice(0, 20).map((q) => (
            <span key={q.id} className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded">
              {layout === "vertical"
                ? `${q.operand1} × ${q.operand2}`
                : `${q.operand1} × ${q.operand2} = ?`}
            </span>
          ))}
          {questions.length > 20 && (
            <span className="text-xs text-neutral-500 self-center">
              +{questions.length - 20} more…
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {isPending ? "Saving…" : "Save Task"}
      </button>
    </div>
  );
}
