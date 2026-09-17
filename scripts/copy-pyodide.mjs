/**
 * Copies the Pyodide runtime into public/pyodide so the sandbox worker is
 * self-hosted (no CDN needed for the core runtime). Runs on postinstall and
 * before every build.
 */
import { cp, mkdir, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("pyodide/package.json"));
const target = path.resolve("public/pyodide");

const FILES = ["pyodide.mjs", "pyodide.js", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"];

await mkdir(target, { recursive: true });
for (const file of FILES) {
  await access(path.join(source, file));
  await cp(path.join(source, file), path.join(target, file));
}
console.log(`Pyodide runtime copied to ${path.relative(process.cwd(), target)}`);
