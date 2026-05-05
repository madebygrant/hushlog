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
  // Deno
  if (typeof Deno !== "undefined") {
    return Deno.env.get("NODE_ENV") === "development";
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
  if (filters.length === 0 || (filters.length === 1 && filters[0] === null)) {
    activeFilters = filters.length === 0 ? ["*"] : [];
  } else {
    activeFilters = filters;
  }
}

function isAllowed(prefix) {
  if (activeFilters.includes("*")) return true;
  if (activeFilters.length === 0) return false;
  if (!prefix) return activeFilters.includes("*");
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
      console[fn](`[${prefix}] ${first}`, ...rest);
    } else if (prefix) {
      console[fn](`[${prefix}]`, ...args);
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
  if (!isDev) return await callback();

  const title = prefix ? `[${prefix}] ${label}` : label;
  const groupFn = collapsed ? "groupCollapsed" : "group";
  const hasGroup = typeof console[groupFn] === "function";

  if (hasGroup) {
    if (isBrowser) {
      console[groupFn](`%c${title}`, style("default"));
    } else {
      console[groupFn](title);
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
