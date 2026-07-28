import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const stripAnsi = (s) =>
  typeof s === "string" ? s.replace(/\x1b\[\d+m/g, "") : s;

let calls = [];
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
});

/*
 * isDev and the HUSHLOG_SERVER switch are resolved once at module load, so each
 * environment needs a fresh module instance — hence the cache-busting query.
 */
let instance = 0;
async function loadWith(
  env,
  { browser = false, serviceWorker = false, shimmedProcess = false } = {}
) {
  /*
   * Restore keys in place — assigning process.env swaps the live env object for
   * a plain one, which silently drops its string coercion for later tests.
   */
  const saved = Object.keys(env).map((k) => [k, process.env[k]]);
  Object.assign(process.env, env);
  if (browser) globalThis.window = { document: {}, location: {} };
  /* No window, and no self.postMessage — a blacklist would read this as Node */
  if (serviceWorker)
    globalThis.self = { location: { hostname: "example.com" }, registration: {} };
  /* What a bundler's process shim looks like: env present, no runtime version */
  const versions = Object.getOwnPropertyDescriptor(process, "versions");
  if (shimmedProcess)
    Object.defineProperty(process, "versions", { ...versions, value: {} });
  try {
    return await import(`../src/index.js?prod=${++instance}`);
  } finally {
    if (browser) delete globalThis.window;
    if (serviceWorker) delete globalThis.self;
    if (shimmedProcess) Object.defineProperty(process, "versions", versions);
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("production is silent without HUSHLOG_SERVER", async () => {
  const { log, logScope } = await loadWith({ NODE_ENV: "production" });
  log("nope");
  logScope("db", { target: "server" }).error("also nope");
  assert.equal(calls.length, 0);
});

test("target 'server' prints in production when HUSHLOG_SERVER=1", async () => {
  const { log, logScope } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  const db = logScope("db", { target: "server" });
  const ui = logScope("ui");

  db.error("Query failed:", "boom");
  ui("Modal opened");
  log("unscoped default");

  assert.deepEqual(calls, [
    { method: "error", args: ["[db] Query failed:", "boom"] },
  ]);
});

test("HUSHLOG_SERVER accepts 'true' and rejects other values", async () => {
  const on = await loadWith({ NODE_ENV: "production", HUSHLOG_SERVER: "true" });
  on.logScope("db", { target: "server" })("yes");
  assert.equal(calls.length, 1);

  calls = [];
  const off = await loadWith({ NODE_ENV: "production", HUSHLOG_SERVER: "0" });
  off.logScope("db", { target: "server" })("no");
  assert.equal(calls.length, 0);
});

test("production browser stays silent even with target 'server'", async () => {
  const { log, logScope } = await loadWith(
    { NODE_ENV: "production", HUSHLOG_SERVER: "1" },
    { browser: true }
  );
  logScope("db", { target: "server" }).error("must not reach devtools");
  log.error("nor this");
  assert.equal(calls.length, 0);
});

test("a service worker scope stays silent even with the flag set", async () => {
  const { logScope } = await loadWith(
    { NODE_ENV: "production", HUSHLOG_SERVER: "1" },
    { serviceWorker: true }
  );
  logScope("sw", { target: "server" }).error("must not reach the client");
  assert.equal(calls.length, 0);
});

test("a bundled process shim is not mistaken for a server runtime", async () => {
  const { logScope } = await loadWith(
    { NODE_ENV: "production", HUSHLOG_SERVER: "1" },
    { shimmedProcess: true }
  );
  logScope("db", { target: "server" }).error("must not reach the client");
  assert.equal(calls.length, 0);
});

test("setServerLogScopes overrides per-scope targets", async () => {
  const { logScope, setServerLogScopes } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  const db = logScope("db", { target: "server" });
  const auth = logScope("auth");

  /* Widens 'auth' in, narrows 'db' out — call sites unchanged */
  setServerLogScopes("auth");
  db("dropped");
  auth("kept");

  assert.deepEqual(calls, [{ method: "log", args: ["[auth] kept"] }]);
});

test("setServerLogScopes() with no arguments clears the override", async () => {
  const { logScope, setServerLogScopes } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  setServerLogScopes("auth");
  setServerLogScopes();

  logScope("db", { target: "server" })("back to per-scope targets");
  logScope("auth")("still dev-only");

  assert.deepEqual(calls, [
    { method: "log", args: ["[db] back to per-scope targets"] },
  ]);
});

test("setServerLogScopes(null) silences server output deliberately", async () => {
  const { logScope, setServerLogScopes } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  setServerLogScopes(null);
  logScope("db", { target: "server" }).error("silenced");
  assert.equal(calls.length, 0);
});

test("an all-invalid argument list clears rather than silences", async () => {
  const { logScope, setServerLogScopes } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  const db = logScope("db", { target: "server" });

  setServerLogScopes("");
  db("empty string resets");
  setServerLogScopes(123);
  db("non-string resets");

  assert.deepEqual(
    calls.map((c) => c.args[0]),
    ["[db] empty string resets", "[db] non-string resets"]
  );
});

test("setServerLogScopes drops invalid values mixed with prefixes", async () => {
  const { logScope, setServerLogScopes } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  setServerLogScopes("db", "", null);
  logScope("db", { target: "server" })("kept");
  logScope("auth", { target: "server" })("dropped");
  assert.deepEqual(calls, [{ method: "log", args: ["[db] kept"] }]);
});

test("setLogFilter still applies on top of server targets", async () => {
  const { logScope, setLogFilter } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });
  const db = logScope("db", { target: "server" });
  const api = logScope("api", { target: "server" });

  setLogFilter("api");
  db("filtered out");
  api("allowed");

  assert.deepEqual(calls, [{ method: "log", args: ["[api] allowed"] }]);
});

test("logGroup honours target and still runs its callback", async () => {
  const { logGroup } = await loadWith({
    NODE_ENV: "production",
    HUSHLOG_SERVER: "1",
  });

  const quiet = await logGroup("dev group", () => "ran", { prefix: "ui" });
  assert.equal(quiet, "ran");
  assert.equal(calls.length, 0);

  const loud = await logGroup("server group", () => "ran too", {
    prefix: "db",
    target: "server",
  });
  assert.equal(loud, "ran too");
  assert.deepEqual(calls[0], { method: "group", args: ["[db] server group"] });
});

test("development ignores target entirely", async () => {
  const { logScope } = await loadWith({ NODE_ENV: "development" });
  logScope("ui")("dev default");
  logScope("db", { target: "server" })("dev server-target");
  assert.equal(calls.length, 2);
});
