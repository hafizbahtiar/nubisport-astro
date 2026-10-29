// Salin enjin pelan (src/lib/*.ts) ke hono-workers. --check: tulis apa-apa, exit 1 jika ada fail basi.
// Guna: bun scripts/sync-plan-engine.ts [--check] [--target <dir>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["plan-5k", "distance-plan", "date", "maf", "plan-core"];
const HEADER = (name: string) =>
  `// GENERATED from nubisport-astro src/lib/${name}.ts - do not edit. Run \`bun scripts/sync-plan-engine.ts\` there.\n`;

const args = process.argv.slice(2);
const check = args.includes("--check");
const ti = args.indexOf("--target");
if (ti >= 0 && !args[ti + 1]) throw new Error("--target perlu direktori");
const target = ti >= 0 ? resolve(args[ti + 1]) : resolve(ROOT, "../hono-workers/src/services/nubi-plan/engine");

const outputs = FILES.map((name) => ({
  file: `${name}.ts`,
  text: HEADER(name) + readFileSync(join(ROOT, "src/lib", `${name}.ts`), "utf8"),
}));

if (check) {
  const stale = outputs.filter(({ file, text }) => {
    const path = join(target, file);
    return !existsSync(path) || readFileSync(path, "utf8") !== text;
  });
  if (stale.length) {
    console.error(stale.map(({ file }) => `stale: ${file}`).join("\n"));
    process.exit(1);
  }
  console.log(`up to date: ${target}`);
} else {
  mkdirSync(target, { recursive: true });
  for (const { file, text } of outputs) writeFileSync(join(target, file), text);
  console.log(`wrote ${outputs.length} files to ${target}`);
}
