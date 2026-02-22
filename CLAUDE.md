# CLAUDE.md — Project Rules & Conventions

## 1. Session Context Management

### At Session Start
At the beginning of every session, ask the user:

> "Which context file should I load? Available files are in `claude/context/`. For example: `claude/context/main_idea.md`. Type the filename or press Enter to start without one."

- List any `.md` files found in `claude/context/` so the user can choose.
- Load the chosen file and read its contents to restore prior session state.
- If no file exists yet or the user skips, proceed without context but offer to create one.

### Context File Structure
Different session types use dedicated context files to keep each file focused and concise:

```
claude/context/
├── project_brief.md        ← Product requirements, user stories, roadmap, open questions
│                              Updated in: requirements & planning sessions
│
├── dev_plan.md             ← Tech stack, data model, routes, build order, current progress
│                              Updated in: coding sessions (created before first coding session)
│
└── dev_log_YYYY-MM-DD.md   ← Optional: detailed notes for a specific coding day
                               Useful for long multi-day sprints
```

**Which file to load at session start:**
- Requirements / roadmap discussion → load `project_brief.md`
- Coding / building → load **both** `dev_plan.md` (primary) and `project_brief.md` (for product context)
- Picking up a previous coding day → load `dev_log_YYYY-MM-DD.md` if it exists

**Session discipline:**
- Keep requirements sessions and coding sessions **separate** — coding context grows fast and will bury product decisions if mixed together
- Before ending a requirements session, ensure `dev_plan.md` is up to date so the next coding session can start immediately without re-reading the full brief
- Before ending a coding session, update `dev_plan.md` with: what was completed, what is in progress, and the next step

### Context File Purpose
Context files in `claude/context/` record the running state of a session:
- Current goals and decisions made
- Work in progress and next steps
- Key file paths and architectural choices
- Any blockers or open questions

This allows Claude to resume intelligently after an unexpected restart.

### Updating Context During a Session
Whenever a **meaningful step or decision** is made, update the active context file immediately. Examples of triggers:
- A design decision is finalized
- A feature or sub-task is completed
- A significant bug is found or fixed
- An architectural choice is made
- The user changes direction or priorities

Update format — append or rewrite sections as needed, keeping the file concise and current.

---

## 2. Logging Standards

All code must include logging using a **3-level system** inspired by Log4j conventions.

### Log Levels

| Level | Purpose | When to Use |
|-------|---------|-------------|
| `DEV`  | Verbose debug output | Local development only — variable dumps, trace paths, intermediate values |
| `TEST` | Test execution info  | QA/staging — test case outcomes, assertions, data validation |
| `PRD`  | Production events    | Live environment — errors, warnings, key business events |

### Log Format
Every log entry must include a **timestamp** and **level prefix**:

```
[YYYY-MM-DD HH:mm:ss] [LEVEL] <message>
```

Example:
```
[2026-02-21 14:32:01] [DEV]  Loaded question set: 12 items
[2026-02-21 14:32:05] [PRD]  User submitted answer — question_id=42, correct=true
[2026-02-21 14:32:05] [TEST] Assertion passed: score calculation returns integer
```

### Implementation Guidelines
- Use a shared logger utility/module so format is consistent across the codebase.
- Guard `DEV`-level logs behind an environment/config flag so they are silent in production.
- `PRD`-level logs should always be active; never suppress errors in production.
- Reference Log4j level hierarchy for severity guidance: `DEV < TEST < PRD` (maps roughly to `DEBUG < INFO < ERROR`).

---

## 3. Code Comments

- Add comments when the **intent or reason** behind code is not self-evident.
- Comment complex logic, non-obvious algorithms, and any workarounds.
- Do **not** add comments that merely restate what the code does (e.g., `// increment i`).
- Use inline comments sparingly; prefer block comments above functions for explanations.
- Mark temporary or incomplete code with `// TODO:` or `// FIXME:` tags.

---

## 4. Testing Standards

### Unit Tests — Required for Every Function
- Every non-trivial function **must have a unit test written alongside it** in the same coding step — not deferred.
- Place tests in `src/__tests__/` mirroring the source path (e.g. `src/lib/questionEngine.ts` → `src/__tests__/lib/questionEngine.test.ts`).
- Use **Vitest** as the test runner (already compatible with the Next.js/Vite toolchain).
- Each test file must cover:
  - Happy path (expected input → expected output)
  - Edge cases (empty input, boundary values, invalid types where applicable)
- **Execute the tests immediately** after writing them (`npx vitest run <file>`). Do not leave tests unrun.
- Use `logger.test()` calls inside tests to emit `[TEST]` log lines for key assertions.

### Phase-End Integration Test
- After completing every major phase (e.g. Phase 1, Phase 2), run the **full test suite**:
  ```
  npx vitest run
  ```
- All tests must pass before the phase is marked complete in `dev_plan.md`.
- Record the pass/fail summary in `dev_plan.md` under the relevant phase's completed work section.

---

## 5. General Conventions

- Read files before modifying them.
- Prefer editing existing files over creating new ones.
- Keep solutions simple — do not over-engineer or add features not explicitly requested.
- Never commit secrets, credentials, or sensitive data.
