import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const ESC = String.fromCharCode(27);

/*
 * supportsAnsi is resolved once at module load, so each case needs its own
 * module instance — a unique query string defeats the ESM cache.
 */
let instance = 0;
async function loadWith(env) {
  const saved = {
    FORCE_COLOR: process.env.FORCE_COLOR,
    NO_COLOR: process.env.NO_COLOR,
  };
  for (const key of Object.keys(saved)) delete process.env[key];
  Object.assign(process.env, env);

  const mod = await import(`../src/index.js?color=${instance++}`);

  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return mod;
}

function captureLog(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args);
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

const emitted = (mod) => captureLog(() => mod.log("hello"))[0][0];

/* node --test pipes stdout, so process.stdout.isTTY is false throughout. */

test("no TTY and no override means plain text", async () => {
  const mod = await loadWith({});
  assert.equal(emitted(mod), "hello");
});

test("FORCE_COLOR enables ANSI without a TTY", async () => {
  const mod = await loadWith({ FORCE_COLOR: "1" });
  const out = emitted(mod);
  assert.ok(out.startsWith(`${ESC}[96m`), out);
  assert.ok(out.endsWith(`${ESC}[0m`), out);
  assert.ok(out.includes("hello"));
});

test("FORCE_COLOR as an empty string still opts in", async () => {
  const mod = await loadWith({ FORCE_COLOR: "" });
  assert.ok(emitted(mod).includes(`${ESC}[96m`));
});

test("FORCE_COLOR=0 disables ANSI", async () => {
  const mod = await loadWith({ FORCE_COLOR: "0" });
  assert.equal(emitted(mod), "hello");
});

test("NO_COLOR disables ANSI", async () => {
  const mod = await loadWith({ NO_COLOR: "1" });
  assert.equal(emitted(mod), "hello");
});

test("NO_COLOR wins over FORCE_COLOR", async () => {
  const mod = await loadWith({ NO_COLOR: "1", FORCE_COLOR: "1" });
  assert.equal(emitted(mod), "hello");
});

test("each level paints with its own color", async () => {
  const mod = await loadWith({ FORCE_COLOR: "1" });
  const codes = {
    info: "94",
    warn: "93",
    error: "91",
    success: "92",
  };
  for (const [level, code] of Object.entries(codes)) {
    const method = level === "success" ? "log" : level;
    const original = console[method];
    let out;
    console[method] = (...args) => {
      out = args[0];
    };
    try {
      mod.log[level]("hello");
    } finally {
      console[method] = original;
    }
    assert.ok(out.startsWith(`${ESC}[${code}m`), `${level}: ${out}`);
  }
});

test("prefixes are painted inside the color span", async () => {
  const mod = await loadWith({ FORCE_COLOR: "1" });
  const out = captureLog(() => mod.logScope("auth")("hello"))[0][0];
  assert.equal(out, `${ESC}[96m[auth] hello${ESC}[0m`);
});
