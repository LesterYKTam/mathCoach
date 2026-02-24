# Math Coach — Project Brief

_Last updated: 2026-02-22_

---

## Overview

Math Coach is an iPad-friendly web app that generates daily math drill worksheets for students, inspired by the Kumon method. Coaches (parents/teachers) and students can create and assign structured drill tasks. Each task is a fixed set of questions that can be repeated indefinitely; every attempt is recorded. A report module tracks progress over time for both roles.

---

## User Roles

### Coach (Parent / Admin)
- Selects a student profile from a roster
- Creates tasks and assigns them to students
- Can have more than one student
- Can deactivate tasks they created
- Has full visibility into all student tasks and results (including student self-created tasks)
- Access to report module for any student

### Student
- Selects their own profile (no login/password — Netflix-style profile picker)
- Works on tasks assigned by their coach
- Can create their own tasks (same creation flow as coach)
- Can deactivate tasks they created
- Access to report module for their own history

---

## Flows

### Flow 1 — Profile Selection (Shared Entry Point)
- App opens to a profile picker screen
- Profiles: one or more student profiles + one coach profile
- No authentication required

### Flow 2 — Coach Flow
1. Select coach profile
2. Dashboard: view students, task list, reports
3. Create task → assign to one or more students
4. View student progress in report module

### Flow 3 — Student Flow
1. Select student profile
2. Dashboard: see assigned tasks + self-created tasks
3. Pick a task → attempt it (answer questions online, timer runs)
4. See score and result grade (Pass / Good / Master) at end
5. Create a new task (optional)
6. View own progress in report module

---

## Task System

### Task Definition
A task is a fixed set of generated math questions created once. It includes:
- **Topic & level**: selected from the Kumon-style skill progression (see below)
- **Number of questions**: configurable at creation
- **Time limit**: one time limit for all tiers (e.g. 10 minutes)
- **3-Tier passing thresholds** (score out of total questions):
  - 🟡 **Pass**: minimum score (e.g. 45/90)
  - 🔵 **Good**: medium score (e.g. 60/90)
  - 🏆 **Master**: high score (e.g. 85/90)
- **Active / Inactive**: creator can deactivate; inactive tasks cannot be attempted

### Task Repetition
- Questions are **fixed** after saving (same questions every attempt — like a real Kumon sheet)
- At creation time, user can **regenerate the question set** as many times as they like before saving
- A task can be attempted unlimited times while active
- Each attempt records: timestamp, time taken, score, result grade

### Task Deactivation
- Deactivation is a **soft hide** — the task no longer appears in the active task list
- Purpose: UI cleanup so students/coaches aren't overwhelmed by hundreds of tasks
- Deactivated tasks still exist in history and reports
- Only the creator can deactivate their task

### Task Visibility
- Coach-assigned tasks: visible to the assigned student and the coach
- Student self-created tasks: visible to the student AND the coach
- Coach is management only — coaches cannot attempt tasks

---

## Question Generation System (Kumon-Style Skill Progression)

Inspired by math-aids.com UI. Topics are organized in a **guided progression path** with a **free pick** override.

### Guided Path (default)
A fixed sequence of skills students work through in order, unlocking the next by passing the current. Example progression:

```
Addition
  → L1: Add within 10
  → L2: Add within 20
  → L3: Add within 100 (no carrying)
  → L4: Add within 100 (with carrying)
  → L5: Add 3-digit numbers
  ...
Subtraction
  → L1: Subtract within 10
  ...
Multiplication
  → L1: ×1 tables
  → L2: ×2 tables
  ...
  → L9: ×9 tables
  → L10: Mixed single-digit ×
  → L11: 2-digit × 1-digit
  → L12: 2-digit × 2-digit
  ...
Division / Fractions / Decimals / Algebra (similar structure)

Mix Mode
  → Select 2+ topic groups to combine into one worksheet
```

### Free Pick (override)
Coach or student can skip the path and directly select any topic + level manually.

### Question Generation Parameters (at task creation)
Inspired by math-aids.com configuration UI:
- Topic category (addition, subtraction, multiplication, division, fractions, decimals, algebra)
- Sub-level within topic (following Kumon-style progression)
- Number range / operand size (auto-set by level, override available)
- Number of questions per topic section (e.g. 20 / 40 / 60 / 90 / custom)
- Question layout: vertical or horizontal

### Mix Mode
- User adds multiple topic sections to a single worksheet
- Each section has its own independent parameters (topic, level, number range, question count)
- Questions from all sections are combined (and optionally shuffled) into one worksheet
- Example: 20 questions of ×3 tables + 15 questions of fraction addition = 35-question mixed sheet

### Regenerate at Creation
- During task creation, a **"Regenerate"** button lets the user re-roll the question set
- Questions are only fixed once the user saves the task
- This allows previewing different question sets before committing

---

## Report Module

Accessible by both coach and student.

### What it shows:
- All attempts for a task: date, time taken, score, result grade (Pass/Good/Master)
- **Progress trend chart**: score % over attempts (x = attempt number or date, y = score %)
- Filterable by task, topic, or date range

---

## Phases

### Phase 1 — MVP (current) ✅ COMPLETE
Full app structure with all flows (coach, student, reports), but **only one task type**:
- **Multiplication Drill** — factors 1–15 (15×15 grid, 225 facts)
- UI modelled on math-aids.com Advanced Times Tables Drill:
  - **15×15 selection grid** — click cells to choose which multiplication facts to include
  - Row/column quick-select buttons; Select All / Clear All
  - Question count presets: **30 / 60 / 90**
  - Layout: vertical or horizontal question format
  - Questions randomly drawn from selected facts, fixed on save
  - Regenerate button before saving
- **Coach can assign one task to multiple students** (independent task record per student)
- **Train / Test mode** on attempt screen:
  - Count-up timer (starts at 0:00)
  - 🟡 Train: timer turns yellow at time limit, student may keep going
  - 🔵 Test: worksheet auto-submits when time limit is reached

### Phase 2+ — Future
- Additional task types (division, fractions, addition, subtraction, decimals, algebra)
- Mix Mode
- Guided Kumon-style progression path

---

## Non-Functional Requirements

- **Platform**: iPad-friendly web app (responsive, touch-optimized)
- **No authentication**: profile-picker model (like Netflix)
- **Offline-capable preferred**: local data storage
- **Printable**: worksheets should be print-friendly (browser print)

---

## Open Questions

_All resolved — none pending._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-21 | Grade range G3–G8 as general reference | Kumon-style levels replace strict grade gating |
| 2026-02-21 | Kumon-inspired skill progression | Structured repetition proven effective for math fluency |
| 2026-02-21 | iPad-friendly web app | Accessibility across family/school devices |
| 2026-02-21 | No login — Netflix-style profile picker | Simple UX, home/classroom use |
| 2026-02-21 | Fixed questions per task (not regenerated) | Mirrors real Kumon sheets; tracks true improvement |
| 2026-02-21 | 3-tier passing: Pass / Good / Master | Motivating progression within a single task |
| 2026-02-21 | One time limit, 3 score thresholds | Simpler UX; time is a shared constraint |
| 2026-02-21 | Coach sees all student tasks including self-created | Coach maintains full oversight |
| 2026-02-21 | Creator-only deactivation | Preserves student autonomy for self-created tasks |
| 2026-02-21 | Guided path + free pick for skill levels | Combines structured progression with flexibility |
| 2026-02-21 | math-aids.com as UI reference for question generation | Good benchmark for parameter coverage and layout |
| 2026-02-21 | No locks on guided path — purely visual | Keeps UX simple; coach/student control their own pace |
| 2026-02-21 | Coach is management only, cannot attempt tasks | Clear role separation |
| 2026-02-21 | Mix Mode: each topic section has independent params | Full flexibility; not just even splits |
| 2026-02-21 | Deactivation = soft hide for UI cleanup | Tasks stay in history/reports; not deleted |
| 2026-02-21 | Regenerate button during task creation | User can re-roll questions before saving; fixed on save |
| 2026-02-21 | Mix Mode questions are shuffled | Prevents topic clustering; feels like a real mixed drill |
| 2026-02-21 | Deactivated tasks hidden from task list, visible in reports | Keeps UI clean while preserving full history |
| 2026-02-21 | Phase 1 scope: 1×1 multiplication only | Delivers full app structure with bounded, testable content |
| 2026-02-21 | Multiplication grid UI modelled on math-aids.com Advanced Times Tables Drill | Proven UX for fact selection |
