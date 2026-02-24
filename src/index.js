const styling = `color: #5de4c7; font-weight: bold; font-family: 'SF Mono', monospace; border-radius: 4px; text-shadow: 1px 1px 2px #222;`;

/**
 * Logs styled messages to the console in development environments only.
 * Usage: log('Message', optionalData)
 */
export function log(...args) {
  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  if (isDev) {
    if (args.length >= 1 && typeof args[0] === "string") {
      console.log(`%c${args[0]}`, styling, ...args.slice(1));
    } else {
      console.log(...args);
    }
  }
}
