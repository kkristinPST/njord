// build.mjs — precompiles the app into bundle/app.js + bundle/app.css.
//
// Why this exists: the page used to ship @babel/standalone (~2.9 MB) and have it transpile
// ~1.1 MB of JSX in the browser on every load. That cost ~10.7 s of main-thread blocking
// time. Transpiling ahead of time removes both the download and the work.
//
// The sources are CLASSIC SCRIPTS, not modules: they share state through top-level
// declarations and window.*. So the bundle is a plain ordered concatenation, NOT an
// esbuild "bundle" — no IIFE wrapper, no module scope, no identifier renaming at the top
// level (verified: esbuild's minifier only renames locals in `transform` mode).
//
// Usage:
//   node build.mjs            build once
//   node build.mjs --watch    rebuild on source change
//   node build.mjs --dev      build unminified, with sourcemaps
//
// After adding a screen, add its path to JS_FILES (order matters — main.jsx stays last)
// and re-run. Commit bundle/ : GitHub Pages serves the repo as-is, with no build step.

import * as esbuild from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(ROOT, "bundle");

// Load order is load-bearing: later files reference globals the earlier ones define.
const JS_FILES = [
  "lib/icon.jsx",
  "lib/facility.jsx",
  "lib/mimic-registry.jsx",
  "lib/mortality-causes.jsx",
  "lib/alarm-log.jsx",
  "lib/chrome.jsx",
  "lib/alarmstore.jsx",
  "lib/alarm-governance.jsx",
  "lib/dialogs.jsx",
  "lib/states.jsx",
  "lib/manuals.jsx",
  "lib/notes.jsx",
  "lib/trends.jsx",
  "lib/trend-window.jsx",
  "lib/scada.jsx",
  "screens/equipment.jsx",
  "screens/equipment-tabs.jsx",
  "screens/start.jsx",
  "screens/navshow.jsx",
  "screens/alarms.jsx",
  "screens/maneuver.jsx",
  "screens/alarm-stats.jsx",
  "screens/alarm-rationalization-data.jsx",
  "screens/alarm-rationalization.jsx",
  "screens/reports.jsx",
  "screens/settings.jsx",
  "screens/oncall-delivery.jsx",
  "screens/fish-welfare.jsx",
  "screens/fish-biology.jsx",
  "screens/feeding-dialogs.jsx",
  "screens/feeding.jsx",
  "screens/tank.jsx",
  "screens/tank-vitals.jsx",
  "screens/ras.jsx",
  "screens/ras-mimic.jsx",
  "screens/ras-dpt2-mimic.jsx",
  "screens/ras-dock.jsx",
  "screens/fish-tank-dock.jsx",
  "screens/water-treatment.jsx",
  "screens/sludge-treatment.jsx",
  "screens/fish-summary.jsx",
  "screens/site-plan.jsx",
  "screens/systems-a.jsx",
  "screens/energy-plant-mimic.jsx",
  "screens/pump-sump.jsx",
  "screens/hyflow.jsx",
  "screens/dead-fish.jsx",
  "screens/systems-b.jsx",
  "screens/common-technical.jsx",
  "screens/energy-consumption.jsx",
  "screens/heat-pumps.jsx",
  "screens/consumption.jsx",
  "screens/overview.jsx",
  "screens/systems-c.jsx",
  "screens/trend-groups.jsx",
  "screens/data-entry.jsx",
  "screens/commissioning.jsx",
  "screens/mbbr-startup.jsx",
  "screens/analytics.jsx",
  "lib/command-palette.jsx",
  "lib/main.jsx", // entry — keep last
];

// Cascade order matters: tokens define the custom properties everything else reads,
// responsive overrides come last.
const CSS_FILES = [
  "lib/tokens.css",
  "lib/app.css",
  "lib/screens.css",
  "lib/dialogs.css",
  "lib/states.css",
  "lib/responsive.css",
];

const DEV = process.argv.includes("--dev");
const kb = (n) => (n / 1024).toFixed(0) + " KB";

// Guard the one way a plain concatenation differs from separate <script> tags: separate scripts
// each get their own top-level lexical scope, so two files could both declare `const Foo` (or one
// could alias a global that another declares as `function Foo`). Concatenated, that is a
// SyntaxError that kills the ENTIRE bundle. Catch it here with a filename, rather than shipping a
// blank page. Lexical names must be globally unique; `function`/`var` may repeat (last wins, as
// it did with separate scripts) but must not collide with a lexical name.
function topLevelDecls(code) {
  const lexical = [];
  const loose = [];
  // Strip line comments so commented-out declarations don't register.
  const src = code.replace(/^\s*\/\/.*$/gm, "");
  for (const m of src.matchAll(/^(const|let|class|var|function)\s+([A-Za-z_$][\w$]*)/gm)) {
    (m[1] === "var" || m[1] === "function" ? loose : lexical).push(m[2]);
  }
  // `const { a, b: c } = window` / `const [a, b] = ...` — the pattern that first broke this build.
  for (const m of src.matchAll(/^(?:const|let)\s*([{[])([^}\]]*)[}\]]\s*=/gm)) {
    for (const part of m[2].split(",")) {
      const name = part.includes(":") ? part.split(":")[1] : part.replace(/=.*$/, "");
      const clean = name.replace(/^\s*\.\.\./, "").trim();
      if (/^[A-Za-z_$][\w$]*$/.test(clean)) lexical.push(clean);
    }
  }
  return { lexical, loose };
}

async function assertNoTopLevelCollisions(sources) {
  const lexOwner = new Map();
  const looseOwner = new Map();
  const clashes = [];
  for (const { file, code } of sources) {
    const { lexical, loose } = topLevelDecls(code);
    for (const name of lexical) {
      if (lexOwner.has(name)) clashes.push(`${name}: declared in ${lexOwner.get(name)} and ${file}`);
      else if (looseOwner.has(name)) clashes.push(`${name}: function/var in ${looseOwner.get(name)} vs lexical in ${file}`);
      else lexOwner.set(name, file);
    }
    for (const name of loose) {
      if (lexOwner.has(name)) clashes.push(`${name}: lexical in ${lexOwner.get(name)} vs function/var in ${file}`);
      else looseOwner.set(name, file);
    }
  }
  if (clashes.length) {
    throw new Error(
      "Top-level name collisions would break the concatenated bundle:\n  " +
        clashes.join("\n  ") +
        "\nFix: drop the redundant alias, or rename one declaration."
    );
  }
}

async function buildJs() {
  const sources = await Promise.all(
    JS_FILES.map(async (file) => ({ file, code: await readFile(path.join(ROOT, file), "utf8") }))
  );
  await assertNoTopLevelCollisions(sources);

  const parts = [];
  for (const { file, code } of sources) {
    const out = await esbuild.transform(code, {
      loader: "jsx",
      target: "es2019",
      minify: !DEV,
      sourcefile: file,
    });
    for (const w of out.warnings) console.warn(`  ! ${file}: ${w.text}`);
    // Keep a marker per file so a stack trace in the minified bundle is still traceable.
    parts.push(`/*${file}*/\n${out.code}`);
  }

  const rawBytes = sources.reduce((n, s) => n + Buffer.byteLength(s.code), 0);
  const js = parts.join("\n");

  // Belt and braces: the per-file transforms can each be valid while the concatenation is not.
  // Parse the whole thing the way the browser will, so a bad build fails here and not in the page.
  try {
    new Function(js);
  } catch (e) {
    throw new Error(`Bundle does not parse as a script: ${e.message}`);
  }

  await writeFile(path.join(OUT_DIR, "app.js"), js);
  console.log(`  app.js   ${JS_FILES.length} files  ${kb(rawBytes)} -> ${kb(Buffer.byteLength(js))}`);
}

async function buildCss() {
  const sources = await Promise.all(
    CSS_FILES.map(async (file) => ({ file, code: await readFile(path.join(ROOT, file), "utf8") }))
  );
  const parts = [];
  for (const { file, code } of sources) {
    const out = await esbuild.transform(code, { loader: "css", minify: !DEV, sourcefile: file });
    parts.push(`/*${file}*/\n${out.code}`);
  }
  const rawBytes = sources.reduce((n, s) => n + Buffer.byteLength(s.code), 0);
  const css = parts.join("\n");
  await writeFile(path.join(OUT_DIR, "app.css"), css);
  console.log(`  app.css  ${CSS_FILES.length} files  ${kb(rawBytes)} -> ${kb(Buffer.byteLength(css))}`);
}

async function build() {
  const t = process.hrtime.bigint();
  await mkdir(OUT_DIR, { recursive: true });
  await Promise.all([buildJs(), buildCss()]);
  console.log(`built in ${Number(process.hrtime.bigint() - t) / 1e6 | 0} ms${DEV ? " (dev)" : ""}`);
}

await build();

if (process.argv.includes("--watch")) {
  console.log("watching lib/ and screens/ ...");
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error(e.message)), 60);
  };
  for (const dir of ["lib", "screens"]) watch(path.join(ROOT, dir), rebuild);
}
