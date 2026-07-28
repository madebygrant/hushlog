# hushlog

Drop-in console logging for development. Silent in production unless you tell a server to speak, scoped namespacing with runtime filtering — no setup required.

[Documentation and live demo →](https://madebygrant.github.io/hushlog/)

## Install

```bash
npm install hushlog
```

## Usage

```js
import { log } from "hushlog";

log("Server response:", data);
log("User authenticated");
```

Output is only shown when `NODE_ENV === 'development'`. In production, `log` is completely silent — no configuration needed.

## Log Levels

`hushlog` includes five log levels, each with distinct colour styling:

```js
import { log } from "hushlog";

log("Fetching user:", id); // Cyan   — general output
log.info("Cache hit:", key); // Blue   — informational messages
log.warn("Token expiring soon"); // Yellow — warnings, deprecations
log.error("Request failed:", err); // Red    — errors, failures
log.success("User saved!"); // Green  — confirmations, completed actions
```

| Method          | Colour | Use for                          |
| --------------- | ------ | -------------------------------- |
| `log()`         | Cyan   | General output                   |
| `log.info()`    | Blue   | Informational messages           |
| `log.warn()`    | Yellow | Warnings, deprecations           |
| `log.error()`   | Red    | Errors, failures                 |
| `log.success()` | Green  | Confirmations, completed actions |

## Features

- **Zero output in production** — logs are automatically suppressed outside of development
- **Opt-in server logs** — mark a scope `target: 'server'` to keep it in production stdout while the browser stays silent
- **Five log levels** — distinct colour styling for each level
- **Styled output** — colour-highlighted in browser devtools, ANSI colours in Node terminals (respects `NO_COLOR`)
- **Flexible arguments** — pass a string label, additional data, or any combination
- **No dependencies** — tiny footprint, nothing extra installed
- **ESM and CJS** — works in modern bundlers and Node.js out of the box

## API

All level methods share the same signature:

```js
log(message?, ...args)
log.info(message?, ...args)
log.warn(message?, ...args)
log.error(message?, ...args)
log.success(message?, ...args)
```

| Argument  | Type     | Description                                        |
| --------- | -------- | -------------------------------------------------- |
| `message` | `string` | A label or message, rendered with styling          |
| `...args` | `any`    | Any additional values to log alongside the message |

### `logScope(prefix)`

Returns a namespaced logger instance with all five level methods attached.

| Argument           | Type                  | Description                                              |
| ------------------ | --------------------- | -------------------------------------------------------- |
| `prefix`           | `string`              | A namespace label shown as `[prefix]` in output          |
| `options.target`   | `'dev' \| 'server'`   | Where the logger may output. Defaults to `'dev'`         |

### `setLogFilter(...prefixes)`

Controls which namespaced loggers produce output.

| Value           | Behaviour                      |
| --------------- | ------------------------------ |
| `'*'`           | Show all logs (default)        |
| `'auth'`        | Show only `[auth]` logs        |
| `'auth', 'api'` | Show `[auth]` and `[api]` logs |
| `null`          | Silence everything             |

### `setServerLogScopes(...prefixes)`

Overrides every logger's `target`, deciding which prefixes reach production server output. Call with no arguments to clear the override and fall back to per-logger targets.

| Value            | Behaviour                                          |
| ---------------- | -------------------------------------------------- |
| `'db'`           | Only `[db]` logs reach the production server       |
| `'db', 'auth'`   | `[db]` and `[auth]` reach the production server     |
| `null`           | Silence all production server output                |
| _(no arguments)_ | Clear the override, use each logger's own `target` |

Invalid arguments are dropped. If that leaves nothing usable — `setServerLogScopes('')` — the override clears rather than silencing, so a typo can't quietly take production logging down. Pass `null` to silence on purpose.

## Prefixes & Namespacing

Use `logScope` to create a named logger for a specific module or feature. Every message will be prefixed so you can immediately tell where it came from:

```js
import { logScope } from "hushlog";

const log = logScope("auth");

log("User signed in:", user); // [auth] User signed in:
log.warn("Token expiring soon"); // [auth] Token expiring soon
log.error("Invalid credentials"); // [auth] Invalid credentials
```

Each module in your project can have its own logger:

```js
// auth.js
const log = logScope("auth");

// api.js
const log = logScope("api");

// store.js
const log = logScope("store");
```

## Groups

Use `logGroup` to wrap related logs in a collapsible section in devtools:

```js
import { log, logGroup } from "hushlog";

logGroup("Fetch User", () => {
  log("Requesting /api/user");
  log.info("Headers:", headers);
  log.success("Response:", data);
});
```

In devtools this renders as a collapsible block:

```
▼ Fetch User
    Requesting /api/user
    Headers: { ... }
    Response: { ... }
```

**Collapsed by default**

Pass `{ collapsed: true }` to render the group closed until clicked:

```js
logGroup(
  "Fetch User",
  () => {
    log("Requesting /api/user");
    log.success("Response:", data);
  },
  { collapsed: true }
);
```

**Async support**

`logGroup` is async-aware — the group stays open until the callback fully resolves:

```js
await logGroup("Load Config", async () => {
  const config = await fetchConfig();
  log.success("Config loaded:", config);
});
```

**With `logScope`**

`logGroup` accepts a `prefix` option to match a scoped logger:

```js
const log = logScope("api");

logGroup(
  "Fetch User",
  () => {
    log("Requesting /api/user");
    log.success("Done:", data);
  },
  { prefix: "api" }
);
```

Output:

```
▼ [api] Fetch User
    [api] Requesting /api/user
    [api] Done: { ... }
```

### `logGroup(label, callback, options?)`

| Option      | Type      | Default     | Description                                              |
| ----------- | --------- | ----------- | -------------------------------------------------------- |
| `collapsed` | `boolean` | `false`     | Render the group collapsed by default                    |
| `prefix`    | `string`  | `undefined` | Namespace label, shown as `[prefix]` in the group header |
| `target`    | `'dev' \| 'server'` | `'dev'` | Where the group may output                     |

Use `setLogFilter` to control which prefixes are shown at runtime. Useful when you want to focus on one area of your app without changing any code:

```js
import { setLogFilter } from "hushlog";

setLogFilter("auth"); // only show [auth] logs
setLogFilter("auth", "api"); // show [auth] and [api] logs
setLogFilter("*"); // show all logs (default)
setLogFilter(null); // silence everything
```

Unprefixed logs from the default `log` are always shown unless `setLogFilter(null)` is used.

## Server-Only Production Logs

Server-rendered apps often want production logs in the terminal — where a hosted log collector can pick them up — while the browser stays completely silent. Mark a scope with `target: 'server'` and it survives into production on the server, and only there:

```js
import { logScope } from "hushlog";

const dbLog = logScope("db", { target: "server" });
const uiLog = logScope("ui"); // dev only, the default

dbLog.error("Query failed:", err); // dev, and production stdout
uiLog("Modal opened"); // dev only
```

Two switches have to agree before anything prints in production:

1. **The deploy switch** — set `HUSHLOG_SERVER=1` (or `true`) in the server environment. Without it, production is silent exactly as before, so ops can kill all production logging without a code change.
2. **The code switch** — a logger's `target`, or a `setServerLogScopes` override.

| `target`             | Dev browser | Dev server | Prod browser | Prod server\* |
| -------------------- | ----------- | ---------- | ------------ | ------------- |
| `'dev'` _(default)_  | ✅          | ✅         | ❌           | ❌            |
| `'server'`           | ✅          | ✅         | ❌           | ✅            |

\* with `HUSHLOG_SERVER=1`

A production browser is never reachable, whatever the target. Web Workers and service workers count as browser and stay silent. Beyond excluding those by name, production output requires positive evidence of a server runtime — `process.versions.node`, which no bundler synthesises — so a `process` shim in a client bundle cannot switch logging on even if the flag reaches it.

**Workers-style runtimes.** Cloudflare Workers and similar edge runtimes read configuration from bindings, not `process.env`, so `HUSHLOG_SERVER` is invisible there without Node compatibility enabled (`nodejs_compat` on Cloudflare). Without it the flag is silently ignored and production stays quiet.

### Changing targets without touching call sites

`setServerLogScopes` overrides every logger's `target` at once, which is useful for widening a scope during an incident or narrowing a noisy one:

```js
import { setServerLogScopes } from "hushlog";

setServerLogScopes("db", "auth", "payments"); // only these reach prod stdout
setServerLogScopes(); // clear, back to per-logger targets
```

`setLogFilter` still applies on top — a scope has to pass both.

### Before you turn it on

- **Logs leave the box.** Production output goes to your platform's log store — Datadog, CloudWatch, Vercel — so treat anything you log at `target: 'server'` as data you are shipping to a third party. Keep secrets and personal data out of it.
- **Nothing is tree-shaken.** The browser/server split happens at runtime, so log strings and argument expressions still ship in the client bundle and still evaluate at the call site. This is unchanged from dev-only logging, but `target: 'server'` does not make a log free on the client.
- **Errors are not special-cased.** `log.error` defaults to `'dev'` like every other level. Opt in per scope where you want errors in production.
- **`setServerLogScopes` is process-wide, not request-scoped.** A call inside a request handler changes output for every concurrent request in that process, so one debugging session widens the logs — and the data leaving the box — for everyone served by it. Configure it at boot.

## Imports

Named and default imports are all supported:

```js
import log, { logScope, logGroup, setLogFilter, setServerLogScopes } from "hushlog";
import { log, logScope, logGroup, setLogFilter, setServerLogScopes } from "hushlog";
```

## How It Works

`hushlog` works out whether you are in development at runtime, checking in this order:

1. `import.meta.env.DEV` — Vite, in the browser and during SSR
2. `process.env.NODE_ENV === "development"` — Node.js, Next.js, webpack, Bun
3. `NODE_ENV` via `Deno.env` — skipped without `--allow-env` rather than throwing
4. A `localhost` hostname — plain browsers and web workers with no bundler

If none of those say development, every method returns before touching the console. No build flags, no setup. The one exception is opt-in: a scope with `target: 'server'` on a server with `HUSHLOG_SERVER=1` — see [Server-Only Production Logs](#server-only-production-logs).

**Silent, not stripped.** Suppression happens at runtime, so hushlog and your log messages still ship in the production bundle — they are simply never printed. Removing them entirely takes a build-time transform of your own call sites; with esbuild, Rollup or Vite you can mark the calls as side-effect free so the minifier drops them:

```js
// vite.config.js
export default {
  esbuild: {
    pure: ["log", "log.info", "log.warn", "log.error", "log.success"],
  },
};
```

Keep secrets out of log messages either way.

## Environment Compatibility

Verified against:

- [Vite](https://vitejs.dev)
- [Next.js](https://nextjs.org) — including Next 16 with Turbopack, server and client components
- [Webpack](https://webpack.js.org)
- Node.js, Bun, Deno
- Plain browsers and web workers

### Colour in terminals

Browser devtools get `%c` styling. Node prints ANSI colour when stdout is a TTY.

| Variable            | Effect                                                      |
| ------------------- | ----------------------------------------------------------- |
| `FORCE_COLOR`       | Enables colour even when output is piped — Docker, CI, hosted log collectors |
| `FORCE_COLOR=0`     | Disables colour                                             |
| `NO_COLOR`          | Disables colour, and wins over `FORCE_COLOR`                |

## License

MIT
