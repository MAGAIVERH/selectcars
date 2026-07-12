import { defineConfig } from "tsup";

/**
 * Production build.
 *
 * The workspace packages (`@selectcars/db`, `@selectcars/shared`) ship raw TypeScript, so
 * they are bundled in rather than resolved at runtime: the runtime image then needs no
 * TypeScript toolchain and boots plain Node. `pg` stays external because it is a native
 * driver and must be resolved from node_modules.
 */
export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node22",
  platform: "node",
  noExternal: [/^@selectcars\//],
  external: ["pg", "pg-native"],
  clean: true,
  minify: false, // keep stack traces readable in production logs
  sourcemap: true,
});
