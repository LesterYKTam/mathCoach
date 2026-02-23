/**
 * Unit tests for src/lib/logger.ts
 *
 * Covers:
 *   - Correct log format ([YYYY-MM-DD HH:mm:ss] [LEVEL] message)
 *   - Level filtering (DEV suppressed in PRD mode, etc.)
 *   - PRD logs routed to stderr, others to stdout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import logger from "@/lib/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ISO_TIMESTAMP_RE = /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/;

function captureConsole() {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  return { logSpy, errSpy };
}

function restoreConsole() {
  vi.restoreAllMocks();
}

// ─── Log format ──────────────────────────────────────────────────────────────

describe("logger format", () => {
  beforeEach(() => { process.env.LOG_LEVEL = "DEV"; });
  afterEach(restoreConsole);

  it("DEV log starts with a valid timestamp", () => {
    const { logSpy } = captureConsole();
    logger.dev("test message");
    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toMatch(ISO_TIMESTAMP_RE);
    logger.test("logger format: DEV timestamp valid");
  });

  it("DEV log contains [DEV] level tag", () => {
    const { logSpy } = captureConsole();
    logger.dev("hello dev");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("[DEV]");
    expect(output).toContain("hello dev");
    logger.test("logger format: DEV level tag present");
  });

  it("TEST log contains [TEST] level tag", () => {
    const { logSpy } = captureConsole();
    logger.test("hello test");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("[TEST]");
    expect(output).toContain("hello test");
    logger.test("logger format: TEST level tag present");
  });

  it("PRD log contains [PRD] level tag and routes to stderr", () => {
    const { errSpy } = captureConsole();
    logger.prd("hello prd");
    expect(errSpy).toHaveBeenCalledOnce();
    const output = errSpy.mock.calls[0][0] as string;
    expect(output).toContain("[PRD]");
    expect(output).toContain("hello prd");
    logger.test("logger format: PRD routes to stderr");
  });
});

// ─── Level filtering ─────────────────────────────────────────────────────────

describe("logger level filtering", () => {
  afterEach(() => {
    delete process.env.LOG_LEVEL;
    restoreConsole();
  });

  it("LOG_LEVEL=PRD suppresses DEV and TEST logs", () => {
    process.env.LOG_LEVEL = "PRD";
    const { logSpy, errSpy } = captureConsole();

    logger.dev("should be suppressed");
    logger.test("should be suppressed");

    expect(logSpy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
    logger.test("logger filtering: DEV+TEST suppressed at PRD level");
  });

  it("LOG_LEVEL=PRD still emits PRD logs", () => {
    process.env.LOG_LEVEL = "PRD";
    const { errSpy } = captureConsole();

    logger.prd("important error");
    expect(errSpy).toHaveBeenCalledOnce();
    logger.test("logger filtering: PRD log emitted at PRD level");
  });

  it("LOG_LEVEL=TEST suppresses DEV but emits TEST and PRD", () => {
    process.env.LOG_LEVEL = "TEST";
    const { logSpy, errSpy } = captureConsole();

    logger.dev("suppressed");
    logger.test("visible");
    logger.prd("visible error");

    // Only TEST (via console.log) and PRD (via console.error) should appear
    expect(logSpy).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledOnce();
    logger.test("logger filtering: TEST level allows TEST+PRD only");
  });

  it("LOG_LEVEL=DEV emits all three levels", () => {
    process.env.LOG_LEVEL = "DEV";
    const { logSpy, errSpy } = captureConsole();

    logger.dev("dev msg");
    logger.test("test msg");
    logger.prd("prd msg");

    // DEV + TEST → console.log (2 calls), PRD → console.error (1 call)
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(errSpy).toHaveBeenCalledOnce();
    logger.test("logger filtering: DEV level emits all three");
  });
});
