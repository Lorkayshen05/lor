// Self-hosts the Pyodide core runtime under public/pyodide (so the wasm/js
// bootstrap loads same-origin, fast and offline-capable) while rewriting
// pyodide-lock.json so individual packages (numpy, pandas, ...) still lazy
// -load from jsDelivr on demand instead of bloating the repo.
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "pyodide");
const dest = join(root, "public", "pyodide");

if (!existsSync(src)) {
  console.warn("[setup-pyodide] node_modules/pyodide not found, skipping (run `npm install` first).");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

const CORE_FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide.d.ts",
  "pyodide-lock.json",
];

for (const file of CORE_FILES) {
  const from = join(src, file);
  if (existsSync(from)) copyFileSync(from, join(dest, file));
}

const pkgVersion = JSON.parse(readFileSync(join(src, "package.json"), "utf8")).version;
const lockPath = join(dest, "pyodide-lock.json");
const lock = JSON.parse(readFileSync(join(src, "pyodide-lock.json"), "utf8"));
const cdnBase = `https://cdn.jsdelivr.net/pyodide/v${pkgVersion}/full/`;

for (const pkg of Object.values(lock.packages)) {
  if (pkg.file_name && !pkg.file_name.startsWith("http")) {
    pkg.file_name = cdnBase + pkg.file_name;
  }
}

writeFileSync(lockPath, JSON.stringify(lock, null, 2));

console.log(`[setup-pyodide] Copied core runtime (v${pkgVersion}) to public/pyodide, rewrote ${Object.keys(lock.packages).length} package URLs to ${cdnBase}`);
