type LogLevel = "debug" | "info" | "warn" | "error";

const logLevels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const fallbackLevel: LogLevel = "info";

function getConfiguredLevel(): LogLevel {
  const rawLevel = process.env.LOG_LEVEL?.toLowerCase();

  if (rawLevel === "debug" || rawLevel === "info" || rawLevel === "warn" || rawLevel === "error") {
    return rawLevel;
  }

  return fallbackLevel;
}

function shouldLog(level: LogLevel): boolean {
  return logLevels[level] >= logLevels[getConfiguredLevel()];
}

function formatMessage(level: LogLevel, message: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  const formatted = formatMessage(level, message);

  if (level === "error") {
    console.error(formatted, meta ?? "");
    return;
  }

  if (level === "warn") {
    console.warn(formatted, meta ?? "");
    return;
  }

  console.log(formatted, meta ?? "");
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta)
};
