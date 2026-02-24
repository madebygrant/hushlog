const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

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

// --- Filter state ---

let activeFilters = ["*"];

export function setLogFilter(...filters) {
  activeFilters = filters.length === 1 && filters[0] === null ? [] : filters;
}

function isAllowed(prefix) {
  if (activeFilters.includes("*")) return true;
  if (activeFilters.length === 0) return false;
  if (!prefix) return true;
  return activeFilters.includes(prefix);
}

// --- Core print ---

function print(level, args, prefix) {
  if (!isDev) return;
  if (!isAllowed(prefix)) return;

  const [first, ...rest] = args;
  const label = prefix ? `[${prefix}] ${first ?? ""}` : first;

  if (typeof first === "string" || prefix) {
    console.log(`%c${label}`, style(level), ...rest);
  } else {
    console.log(...args);
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
  if (!isDev) {
    await callback();
    return;
  }

  const title = prefix ? `[${prefix}] ${label}` : label;

  if (collapsed) {
    console.groupCollapsed(`%c${title}`, style("default"));
  } else {
    console.group(`%c${title}`, style("default"));
  }

  try {
    await callback();
  } finally {
    console.groupEnd();
  }
}

// --- Default logger ---

export const log = createMethods(null);
export default log;
