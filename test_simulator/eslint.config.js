// ESLint flat config for the browser simulator (test_simulator/web_static/js).
//
// The simulator is a set of classic <script> files (see web_templates/index.html)
// that share one global scope: a top-level `function initScene` in scene.js is
// called from main.js, `let renderer` in globals.js is assigned in scene.js, etc.
// Rather than hand-maintaining a list of those cross-file globals, collect every
// top-level declaration from the script files and expose them as globals, so
// `no-undef` still catches real typos and missing functions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";

const here = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.join(here, "web_static", "js");

function listScripts(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) return listScripts(p);
    return ent.name.endsWith(".js") ? [p] : [];
  });
}

function sharedScriptGlobals() {
  const names = {};
  const decl = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:let|const|var|class)\s+([A-Za-z_$][\w$]*(?:\s*(?:=[^,;]*)?\s*,\s*[A-Za-z_$][\w$]*)*)/;
  for (const file of listScripts(jsRoot)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = decl.exec(line); // column 0 only == top-level declaration
      if (!m) continue;
      if (m[1]) names[m[1]] = "writable";
      else {
        // `let a, b = 1, c;` -> a, b, c
        for (const part of m[2].split(",")) {
          const id = part.trim().split(/[\s=]/)[0];
          if (/^[A-Za-z_$][\w$]*$/.test(id)) names[id] = "writable";
        }
      }
    }
  }
  return names;
}

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    files: ["web_static/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        THREE: "readonly",
        io: "readonly",
        ...sharedScriptGlobals(),
      },
    },
    rules: {
      // Each file legitimately declares the globals other files use.
      "no-redeclare": ["error", { builtinGlobals: false }],
      // Top-level functions are an API consumed by other scripts / inline onclick handlers.
      "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["eslint.config.js", "scripts/**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
  },
];
