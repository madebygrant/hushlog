const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";

const isWorker =
  !isBrowser &&
  typeof self !== "undefined" &&
  typeof self.postMessage === "function";

const isDev = (() => {
  // Vite (browser + SSR) — import.meta always defined in ESM
  if (import.meta.env?.MODE) {
    return import.meta.env.DEV;
  }
  // Node.js, webpack, Bun, Next.js, etc.
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === "development";
  }
  // Deno — env access throws without --allow-env
  if (typeof Deno !== "undefined") {
    try {
      return Deno.env.get("NODE_ENV") === "development";
    } catch {
      return false;
    }
  }
  // Plain browser — hostname check is last resort, after all env-based checks
  if (isBrowser) {
    return ["localhost", "127.0.0.1"].includes(window.location?.hostname ?? "");
  }
  // Web Worker
  if (isWorker) {
    return ["localhost", "127.0.0.1"].includes(self.location?.hostname ?? "");
  }
  return false;
})();

// --- Styles ---

const styles = {
  base: `font-weight: bold; font-family: 'SF Mono', monospace; border-radius: 4px; text-shadow: 1px 1px 2px #222;`,
  default: `color: #5de4c7;`,
  info: `color: #80caff;`,
  warn: `color: #f9c74f;`,
  error: `color: #f94144;`,
  success: `color: #90be6d;`,
};

function style(level) {
  return `${styles.base} ${styles[level]}`;
}

const ansiColors = {
  default: "\x1b[96m", // bright cyan
  info: "\x1b[94m", // bright blue
  warn: "\x1b[93m", // bright yellow
  error: "\x1b[91m", // bright red
  success: "\x1b[92m", // bright green
};

const ANSI_RESET = "\x1b[0m";

const supportsAnsi =
  !isBrowser &&
  typeof process !== "undefined" &&
  process.stdout?.isTTY === true &&
  !process.env?.NO_COLOR;

function paint(level, text) {
  return supportsAnsi ? `${ansiColors[level]}${text}${ANSI_RESET}` : text;
}

const consoleMethods = {
  default: "log",
  info: "info",
  warn: "warn",
  error: "error",
  success: "log",
};

// --- Filter state ---

let activeFilters = ["*"];

export function setLogFilter(...filters) {
  if (filters.length === 0) {
    activeFilters = ["*"];
  } else if (filters.length === 1 && filters[0] === null) {
    activeFilters = [];
  } else {
    activeFilters = filters.filter((f) => typeof f === "string" && f !== "");
  }
}

function isAllowed(prefix) {
  if (activeFilters.includes("*")) return true;
  if (activeFilters.length === 0) return false;
  // Unprefixed logs are always shown unless everything is silenced
  if (!prefix) return true;
  return activeFilters.includes(prefix);
}

// --- Core print ---

function print(level, args, prefix) {
  if (!isDev) return;
  if (!isAllowed(prefix)) return;
  if (args.length === 0) return;

  const fn = consoleMethods[level] ?? "log";
  const [first, ...rest] = args;

  if (isBrowser) {
    if (prefix && typeof first === "string") {
      console[fn](`%c[${prefix}] ${first}`, style(level), ...rest);
    } else if (prefix) {
      console[fn](`%c[${prefix}]`, style(level), ...args);
    } else if (typeof first === "string") {
      console[fn](`%c${first}`, style(level), ...rest);
    } else {
      console[fn](...args);
    }
  } else {
    if (prefix && typeof first === "string") {
      console[fn](paint(level, `[${prefix}] ${first}`), ...rest);
    } else if (prefix) {
      console[fn](paint(level, `[${prefix}]`), ...args);
    } else if (typeof first === "string") {
      console[fn](paint(level, first), ...rest);
    } else {
      console[fn](...args);
    }
  }
}

// --- Logger factory ---

function createMethods(prefix) {
  const logger = (...args) => print("default", args, prefix);
  logger.info = (...args) => print("info", args, prefix);
  logger.warn = (...args) => print("warn", args, prefix);
  logger.error = (...args) => print("error", args, prefix);
  logger.success = (...args) => print("success", args, prefix);
  return logger;
}

export function logScope(prefix) {
  return createMethods(prefix);
}

// --- Group ---

export async function logGroup(
  label,
  callback,
  { collapsed = false, prefix } = {}
) {
  if (!isDev || !isAllowed(prefix)) return await callback();

  const title = prefix ? `[${prefix}] ${label}` : label;
  const groupFn = collapsed ? "groupCollapsed" : "group";
  const hasGroup = typeof console[groupFn] === "function";

  if (hasGroup) {
    if (isBrowser) {
      console[groupFn](`%c${title}`, style("default"));
    } else {
      console[groupFn](paint("default", title));
    }
  }

  try {
    return await callback();
  } finally {
    if (hasGroup) console.groupEnd();
  }
}

// --- Default logger ---

export const log = createMethods(null);
export default log;
