# hushlog

A lightweight, styled console logger that stays quiet in production and speaks up in development.

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
- **Five log levels** — distinct colour styling for each level
- **Styled output** — messages are colour-highlighted in the console for easy scanning
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

| Argument | Type     | Description                                     |
| -------- | -------- | ----------------------------------------------- |
| `prefix` | `string` | A namespace label shown as `[prefix]` in output |

### `setLogFilter(...prefixes)`

Controls which namespaced loggers produce output.

| Value           | Behaviour                      |
| --------------- | ------------------------------ |
| `'*'`           | Show all logs (default)        |
| `'auth'`        | Show only `[auth]` logs        |
| `'auth', 'api'` | Show `[auth]` and `[api]` logs |
| `null`          | Silence everything             |

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

Use `setLogFilter` to control which prefixes are shown at runtime. Useful when you want to focus on one area of your app without changing any code:

```js
import { setLogFilter } from "hushlog";

setLogFilter("auth"); // only show [auth] logs
setLogFilter("auth", "api"); // show [auth] and [api] logs
setLogFilter("*"); // show all logs (default)
setLogFilter(null); // silence everything
```

Unprefixed logs from the default `log` are always shown unless `setLogFilter(null)` is used.

## Imports

Named and default imports are all supported:

```js
import log, { logScope, logGroup, setLogFilter } from "hushlog";
import { log, logScope, logGroup, setLogFilter } from "hushlog";
```

## How It Works

`hushlog` checks `process.env.NODE_ENV` at runtime. If it equals `"development"`, your logs are printed to the console with styled formatting. In any other environment — production, test, staging — the function exits silently.

No tree-shaking required, no build flags, no setup.

## Environment Compatibility

Works with any environment that sets `NODE_ENV`, including:

- [Vite](https://vitejs.dev)
- [Next.js](https://nextjs.org)
- [Webpack](https://webpack.js.org)
- Node.js

## License

MIT
