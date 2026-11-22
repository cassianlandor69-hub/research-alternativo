import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const url = args[0] ?? "http://127.0.0.1:4322/";
const out = args[1] ?? "screenshots/page.png";
const width = Number(args[2] ?? 1440);
const height = Number(args[3] ?? 1000);
const fullPage = args[4] !== "viewport";
const mobile = args[5] === "mobile";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-crashpad"],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  reducedMotion: "reduce",
  isMobile: mobile,
  hasTouch: mobile,
  userAgent: mobile
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    : undefined,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage });
console.log(`saved ${out} (${fullPage ? "full" : "viewport"})`);
if (errors.length) {
  console.log("ERRORS:");
  errors.forEach((e) => console.log(" -", e));
}
await browser.close();
