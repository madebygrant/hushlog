export type LogLevel = "default" | "info" | "warn" | "error" | "success";

export interface Logger {
  (...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  success(...args: unknown[]): void;
}

export interface LogGroupOptions {
  collapsed?: boolean;
  prefix?: string;
}

export declare function setLogFilter(): void;
export declare function setLogFilter(silence: null): void;
export declare function setLogFilter(...filters: string[]): void;
export declare function logScope(prefix: string): Logger;
export declare function logGroup<T = unknown>(
  label: string,
  callback: () => T | Promise<T>,
  options?: LogGroupOptions
): Promise<T>;

export declare const log: Logger;
export default log;
