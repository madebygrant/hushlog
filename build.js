import esbuild from "esbuild";

const shared = {
  entryPoints: ["src/index.js"],
  bundle: true,
  minify: true,
};

// ESM build
await esbuild.build({
  ...shared,
  format: "esm",
  outfile: "dist/index.js",
});

// CommonJS build
await esbuild.build({
  ...shared,
  format: "cjs",
  outfile: "dist/index.cjs",
});

console.log("✓ hushlog built successfully");
