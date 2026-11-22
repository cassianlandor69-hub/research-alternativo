import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4321";
const pages = ["/", "/agencias/", "/agencias/havas-creative-spain/", "/agencias/toaster/", "/personas/", "/clientes/", "/noticias/", "/datos/", "/nope/"];
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-crashpad"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
let total = 0;
for (const path of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () =>
    await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }),
  );
  const violations = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  total += violations.length;
  console.log(`\n${path} — ${violations.length} serious/critical violations`);
  for (const v of violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    v.nodes.slice(0, 4).forEach((n) => console.log(`    ${n.target.join(" ")} — ${(n.failureSummary || "").split("\n").slice(0, 2).join(" ")}`));
  }
}
console.log(`\nTOTAL: ${total}`);
await browser.close();
