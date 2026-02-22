/**
 * Logger utility — 3-level system (DEV / TEST / PRD).
 *
 * DEV  : verbose debug output; suppressed unless LOG_LEVEL=DEV or NODE_ENV=development
 * TEST : test-execution info; active when LOG_LEVEL=TEST or LOG_LEVEL=DEV
 * PRD  : production events (errors, key business events); always active
 *
 * Format: [YYYY-MM-DD HH:mm:ss] [LEVEL] <message>
 */

type LogLevel = 'DEV' | 'TEST' | 'PRD';

const LEVEL_RANK: Record<LogLevel, number> = { DEV: 0, TEST: 1, PRD: 2 };

function getActiveLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
  if (env && env in LEVEL_RANK) return env;
  // Default: DEV in development, PRD in production
  return process.env.NODE_ENV === 'development' ? 'DEV' : 'PRD';
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

function log(level: LogLevel, message: string): void {
  const activeRank = LEVEL_RANK[getActiveLevel()];
  if (LEVEL_RANK[level] < activeRank) return;

  const entry = `[${timestamp()}] [${level}] ${message}`;

  if (level === 'PRD') {
    // Route PRD-level errors/warnings to stderr so they are never lost
    console.error(entry);
  } else {
    console.log(entry);
  }
}

const logger = {
  dev:  (message: string) => log('DEV',  message),
  test: (message: string) => log('TEST', message),
  prd:  (message: string) => log('PRD',  message),
};

export default logger;
