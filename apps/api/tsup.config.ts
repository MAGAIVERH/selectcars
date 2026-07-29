import { defineConfig } from "tsup";

/**
 * Production build.
 *
 * The workspace packages (`@selectcars/db`, `@selectcars/shared`) ship raw TypeScript, so
 * they are bundled in rather than resolved at runtime: the runtime image then needs no
 * TypeScript toolchain and boots plain Node. `pg` stays external because it is a native
 * driver and must be resolved from node_modules.
 *
 * Two entrypoints, one bundle pass: `server.ts` answers HTTP and `worker.ts` consumes the
 * queue. They are the same image started with a different command, so the database layer,
 * the env schema, and the repositories exist once and cannot drift between them.
 */
export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts"],
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
