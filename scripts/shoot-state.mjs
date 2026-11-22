import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-crashpad"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await page.goto("http://127.0.0.1:4322/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.locator("[data-search-open]").click();
await page.fill("[data-search-input]", "havas");
await page.waitForTimeout(800);
await page.screenshot({ path: ".screenshots/search.png" });
await page.keyboard.press("Escape");
await page.goto("http://127.0.0.1:4322/agencias/?class=creative&city=madrid", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: ".screenshots/agencies-filtered.png" });
await page.goto("http://127.0.0.1:4322/agencias/toaster/", { waitUntil: "networkidle" });
await page.screenshot({ path: ".screenshots/detail-empty.png", fullPage: true });
await page.goto("http://127.0.0.1:4322/datos/", { waitUntil: "networkidle" });
await page.screenshot({ path: ".screenshots/data-schema.png", fullPage: true });
await browser.close();
