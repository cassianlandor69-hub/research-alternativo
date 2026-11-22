import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const dist = "dist";
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
}
walk(dist);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const html = new Map(htmlFiles.map((f) => [f, readFileSync(f, "utf8")]));
const ids = new Map(htmlFiles.map((f) => [f, new Set([...html.get(f).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&#38;", "&");
const exists = (assetPath) => existsSync(join(dist, decodeURIComponent(assetPath)));

let errors = [];
let checked = 0;
const seen = new Set();

for (const [file, content] of html) {
  const route = "/" + relative(dist, file).replace(/index\.html$/, "").replace(/\\/g, "/");
  const attrs = [...content.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => decode(m[1]));
  for (const raw of attrs) {
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("data:")) continue;
    if (/^https?:\/\//.test(raw)) continue;
    if (raw.startsWith("//")) continue;
    const [pathPart, hash] = raw.split("#");
    const path = pathPart.split("?")[0];
    if (!path) continue;
    if (!path.startsWith("/")) {
      errors.push(`${route}: relative link ${raw}`);
      continue;
    }
    checked++;
    const key = path;
    if (seen.has(`${key}#${hash ?? ""}`)) continue;
    seen.add(`${key}#${hash ?? ""}`);

    let target;
    if (path.endsWith("/")) target = join(dist, path, "index.html");
    else if (path.includes(".")) target = join(dist, path);
    else target = join(dist, path, "index.html");

    if (!existsSync(target)) {
      errors.push(`${route}: missing target ${raw}`);
      continue;
    }
    if (hash && target.endsWith(".html")) {
      const idSet = ids.get(target);
      if (idSet && !idSet.has(hash)) errors.push(`${route}: missing anchor ${raw}`);
    }
  }
}

// duplicate ids per page
for (const [file, content] of html) {
  const all = [...content.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = all.filter((id, i) => all.indexOf(id) !== i);
  if (dupes.length) errors.push(`${relative(dist, file)}: duplicate ids ${[...new Set(dupes)].join(", ")}`);
}

// basic SEO/structure
for (const [file, content] of html) {
  const label = relative(dist, file);
  if ((content.match(/<h1[\s>]/g) ?? []).length !== 1) errors.push(`${label}: h1 count`);
  if (!/<title>[^<]+<\/title>/.test(content)) errors.push(`${label}: missing title`);
  if (!/name="description" content="[^"]+"/.test(content)) errors.push(`${label}: missing description`);
}

console.log(`Scanned ${htmlFiles.length} pages, ${checked} internal references.`);
console.log(errors.length ? `ERRORS (${errors.length}):\n${errors.slice(0, 30).join("\n")}` : "No broken internal links, anchors, duplicate ids or missing metadata.");
process.exit(errors.length ? 1 : 0);
