"use client";

import { type Fact } from "@/lib/questionEngine";

interface MultiplicationGridProps {
  selected: Set<string>;   // keys are "a,b"
  onChange: (selected: Set<string>) => void;
}

const FACTORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function factKey(a: number, b: number) {
  return `${a},${b}`;
}

export function selectedToFacts(selected: Set<string>): Fact[] {
  return Array.from(selected).map((k) => k.split(",").map(Number) as Fact);
}

/**
 * 10×10 multiplication fact selection grid.
 * Rows = first operand (0–9), columns = second operand (0–9).
 * Includes row-select, column-select, Select All, Clear All.
 */
export default function MultiplicationGrid({ selected, onChange }: MultiplicationGridProps) {
  function toggle(a: number, b: number) {
    const next = new Set(selected);
    const key = factKey(a, b);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleRow(a: number) {
    const next = new Set(selected);
    const allSelected = FACTORS.every((b) => next.has(factKey(a, b)));
    if (allSelected) {
      FACTORS.forEach((b) => next.delete(factKey(a, b)));
    } else {
      FACTORS.forEach((b) => next.add(factKey(a, b)));
    }
    onChange(next);
  }

  function toggleCol(b: number) {
    const next = new Set(selected);
    const allSelected = FACTORS.every((a) => next.has(factKey(a, b)));
    if (allSelected) {
      FACTORS.forEach((a) => next.delete(factKey(a, b)));
    } else {
      FACTORS.forEach((a) => next.add(factKey(a, b)));
    }
    onChange(next);
  }

  function selectAll() {
    const next = new Set<string>();
    FACTORS.forEach((a) => FACTORS.forEach((b) => next.add(factKey(a, b))));
    onChange(next);
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div className="space-y-2">
      {/* Quick-select buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="text-xs px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          Clear All
        </button>
        <span className="text-xs text-neutral-400 ml-2 self-center">
          {selected.size} / 100 facts selected
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs select-none">
          <thead>
            <tr>
              {/* Empty top-left corner */}
              <th className="w-7 h-7" />
              {/* Column headers (second operand) with quick-select */}
              {FACTORS.map((b) => (
                <th key={b} className="w-7 h-7 text-center">
                  <button
                    type="button"
                    onClick={() => toggleCol(b)}
                    className="w-full h-full font-bold text-neutral-400 hover:text-white rounded transition-colors"
                    title={`Select column ×${b}`}
                  >
                    {b}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FACTORS.map((a) => (
              <tr key={a}>
                {/* Row header (first operand) with quick-select */}
                <td className="w-7 h-7 text-center">
                  <button
                    type="button"
                    onClick={() => toggleRow(a)}
                    className="w-full h-full font-bold text-neutral-400 hover:text-white rounded transition-colors"
                    title={`Select row ${a}×`}
                  >
                    {a}
                  </button>
                </td>
                {/* Fact cells */}
                {FACTORS.map((b) => {
                  const key = factKey(a, b);
                  const isSelected = selected.has(key);
                  return (
                    <td key={b} className="w-7 h-7 p-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(a, b)}
                        title={`${a} × ${b} = ${a * b}`}
                        className={`
                          w-full h-full rounded text-[10px] font-medium transition-colors
                          ${isSelected
                            ? "bg-sky-600 text-white hover:bg-sky-500"
                            : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
                          }
                        `}
                      >
                        {a * b}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
