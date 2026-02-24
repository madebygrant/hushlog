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

## Features

- **Zero output in production** — logs are automatically suppressed outside of development
- **Styled output** — messages are colour-highlighted in the console for easy scanning
- **Flexible arguments** — pass a string label, additional data, or any combination
- **No dependencies** — tiny footprint, nothing extra installed
- **ESM and CJS** — works in modern bundlers and Node.js out of the box

## API

### `log(...args)`

```js
log(message);
log(message, data);
log(data);
```

| Argument  | Type     | Description                                        |
| --------- | -------- | -------------------------------------------------- |
| `message` | `string` | A label or message, rendered with styling          |
| `...args` | `any`    | Any additional values to log alongside the message |

**Examples**

```js
import { log } from "hushlog";

// Simple message
log("App initialised");

// Message with data
log("User:", { id: 1, name: "Alice" });

// Non-string values
log([1, 2, 3]);
log(42);
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
