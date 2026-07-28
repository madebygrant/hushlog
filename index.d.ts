export type LogLevel = "default" | "info" | "warn" | "error" | "success";

export interface Logger {
  (...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  success(...args: unknown[]): void;
}

/**
 * Where a log is allowed to appear.
 * - `"dev"` — development only (default)
 * - `"server"` — development, plus production server output when
 *   `HUSHLOG_SERVER=1`. Never appears in a production browser.
 */
export type LogTarget = "dev" | "server";

export interface LogScopeOptions {
  target?: LogTarget;
}

export interface LogGroupOptions {
  collapsed?: boolean;
  prefix?: string;
  target?: LogTarget;
}

export declare function setLogFilter(): void;
export declare function setLogFilter(silence: null): void;
export declare function setLogFilter(...filters: string[]): void;
export declare function setServerLogScopes(): void;
export declare function setServerLogScopes(silence: null): void;
export declare function setServerLogScopes(...prefixes: string[]): void;
export declare function logScope(
  prefix: string,
  options?: LogScopeOptions
): Logger;
export declare function logGroup<T = unknown>(
  label: string,
  callback: () => T | Promise<T>,
  options?: LogGroupOptions
): Promise<T>;

export declare const log: Logger;
export default log;
