import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Fails when source reads a process.env key that .env.example does not list.
 *
 * Only src trees are scanned. Build and test config files at a package root are
 * allowed to read the environment, because Next, Playwright, and Vitest run them
 * before any application module exists.
 */

const ROOT = process.cwd();
const SCAN_ROOTS = ["apps", "packages"];
const SKIP = /(\.test\.ts|\.spec\.ts|\.d\.ts)$/;

const NAMED = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const BRACKETED = /process\.env\s*\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\]/g;
const WHOLE = /process\.env(?![.\w[])/g;

interface Read {
  readonly file: string;
  readonly line: number;
  readonly name: string;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== ".next"
      ) {
        walk(path, files);
      }
      continue;
    }
    if (/\.(ts|tsx|mts|cts)$/.test(entry.name) && !SKIP.test(entry.name))
      files.push(path);
  }
  return files;
}

function isEnvModule(path: string): boolean {
  return path.split(sep).at(-1) === "env.ts";
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function collect(file: string, text: string): Read[] {
  const reads: Read[] = [];
  const add = (index: number, name: string) => {
    reads.push({ file: relative(ROOT, file), line: lineOf(text, index), name });
  };

  for (const match of text.matchAll(NAMED)) {
    if (match.index !== undefined) add(match.index, match[1] ?? "");
  }
  for (const match of text.matchAll(BRACKETED)) {
    if (match.index !== undefined) add(match.index, match[1] ?? "");
  }
  if (!isEnvModule(file)) {
    for (const match of text.matchAll(WHOLE)) {
      if (match.index !== undefined) add(match.index, "<whole process.env>");
    }
  }

  return reads;
}

function exampleKeys(): Set<string> {
  const path = join(ROOT, ".env.example");
  let text: string;

  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error("env:check failed: .env.example is missing");
    process.exit(1);
  }

  const keys = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const [key] = line.split("=");
    if (key !== undefined && key !== "") keys.add(key.trim());
  }
  return keys;
}

const files = SCAN_ROOTS.flatMap((root) => {
  try {
    return walk(join(ROOT, root));
  } catch {
    return [];
  }
});

const reads = files.flatMap((file) => collect(file, readFileSync(file, "utf8")));
const known = exampleKeys();
const problems = reads.filter((read) => !known.has(read.name));

if (problems.length === 0) {
  console.log(`env:check passed, ${reads.length} reads across ${files.length} files`);
  process.exit(0);
}

console.error("env:check failed");
for (const problem of problems) {
  console.error(
    `  ${problem.file}:${problem.line} reads ${problem.name}, which .env.example does not list`,
  );
}
console.error("Add the name to .env.example with a safe placeholder.");
process.exit(1);
