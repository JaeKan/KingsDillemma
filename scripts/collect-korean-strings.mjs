import fs from "node:fs";
import path from "node:path";

const hasHangul = (s) => /[\uAC00-\uD7AF]/.test(s);

/** Double-quoted string contents (escaped) */
function collectDoubleQuoted(text) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const s = JSON.parse(`"${m[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))}"`);
      if (hasHangul(s)) out.push(s);
    } catch {
      if (hasHangul(m[1])) out.push(m[1]);
    }
  }
  return out;
}

function collectSingleQuoted(text) {
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(/\\'/g, "'").replace(/\\n/g, "\n");
    if (hasHangul(raw)) out.push(raw);
  }
  return out;
}

/** Template literal one-liner segments — shallow */
function collectTemplateSimple(text) {
  const out = [];
  const re = /`([^`${]*[\uAC00-\uD7AF][^`${]*)`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!m[1].includes("${")) out.push(m[1].replace(/\\n/g, "\n"));
  }
  return out;
}

const srcRoot = path.join(process.cwd(), "src");
const skip = new Set(["gameResources.ts", "koreanUi.ts"]);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(ent.name) && !skip.has(ent.name)) acc.push(p);
  }
  return acc;
}

const files = walk(srcRoot);
const summary = {};
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const set = new Set();
  for (const s of collectDoubleQuoted(text)) set.add(s);
  for (const s of collectSingleQuoted(text)) set.add(s);
  for (const s of collectTemplateSimple(text)) set.add(s);
  const rel = path.relative(srcRoot, f);
  if (set.size) summary[rel] = [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

const outPath = path.join(process.cwd(), "scripts", "korean-strings-raw.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
const total = Object.values(summary).reduce((n, a) => n + a.length, 0);
console.log("files:", Object.keys(summary).length, "strings:", total);
