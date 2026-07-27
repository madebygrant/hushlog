import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "development";
const { log, logScope, logGroup, setLogFilter } = await import(
  "../src/index.js"
);

/* Capture console output; strip ANSI so assertions work with or without TTY */
const stripAnsi = (s) =>
  typeof s === "string" ? s.replace(/\x1b\[\d+m/g, "") : s;

let calls;
const capture = (method) => {
  const original = console[method];
  console[method] = (...args) => {
    calls.push({ method, args: args.map(stripAnsi) });
  };
  return () => {
    console[method] = original;
  };
};

let restores = [];
beforeEach(() => {
  calls = [];
  restores.forEach((r) => r());
  restores = ["log", "info", "warn", "error", "group", "groupCollapsed"].map(
    capture
  );
  setLogFilter("*");
});

test("log prints in development", () => {
  log("hello", 42);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "log");
  assert.deepEqual(calls[0].args, ["hello", 42]);
});

test("levels map to console methods", () => {
  log.info("i");
  log.warn("w");
  log.error("e");
  log.success("s");
  assert.deepEqual(
    calls.map((c) => c.method),
    ["info", "warn", "error", "log"]
  );
});

test("logScope prefixes output", () => {
  logScope("auth")("signed in");
  assert.deepEqual(calls[0].args, ["[auth] signed in"]);
});

test("setLogFilter limits scoped loggers", () => {
  const auth = logScope("auth");
  const api = logScope("api");
  setLogFilter("auth");
  auth("shown");
  api("hidden");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["[auth] shown"]);
});

test("unprefixed logs still shown when filter is set", () => {
  setLogFilter("auth");
  log("always visible");
  assert.equal(calls.length, 1);
});

test("setLogFilter(null) silences everything", () => {
  setLogFilter(null);
  log("nope");
  logScope("auth")("nope");
  assert.equal(calls.length, 0);
});

test("setLogFilter() resets to show all", () => {
  setLogFilter(null);
  setLogFilter();
  logScope("api")("back");
  assert.equal(calls.length, 1);
});

test("setLogFilter drops null/empty mixed with prefixes", () => {
  setLogFilter(null, "api", "");
  logScope("api")("shown");
  logScope("auth")("hidden");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["[api] shown"]);
});

test("logGroup wraps callback and returns its value", async () => {
  const result = await logGroup("Fetch", () => {
    log("inside");
    return 7;
  });
  assert.equal(result, 7);
  assert.equal(calls[0].method, "group");
  assert.deepEqual(calls[0].args, ["Fetch"]);
});

test("logGroup collapsed uses groupCollapsed", async () => {
  await logGroup("Fetch", () => {}, { collapsed: true });
  assert.equal(calls[0].method, "groupCollapsed");
});

test("logGroup respects filter but still runs callback", async () => {
  setLogFilter("auth");
  let ran = false;
  const result = await logGroup(
    "Fetch",
    () => {
      ran = true;
      return "ok";
    },
    { prefix: "api" }
  );
  assert.equal(ran, true);
  assert.equal(result, "ok");
  assert.equal(calls.length, 0);
});

test("logGroup awaits async callbacks", async () => {
  const result = await logGroup("Load", async () => {
    await new Promise((r) => setTimeout(r, 5));
    return "done";
  });
  assert.equal(result, "done");
});
