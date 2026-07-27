import esbuild from "esbuild";

const shared = {
  entryPoints: ["src/index.js"],
  bundle: true,
  minify: true,
  /* esbuild auto-defines process.env.NODE_ENV as "production" when
     minifying for the browser platform, which would hardcode isDev to
     false. Identity-define keeps it a runtime check. */
  define: { "process.env.NODE_ENV": "process.env.NODE_ENV" },
};

// ESM build
await esbuild.build({
  ...shared,
  format: "esm",
  outfile: "dist/index.js",
});

// CommonJS build — import.meta is intentionally shimmed to {} so the
// isDev check falls through to process.env
await esbuild.build({
  ...shared,
  format: "cjs",
  outfile: "dist/index.cjs",
  logOverride: { "empty-import-meta": "silent" },
});

console.log("✓ hushlog built successfully");
