import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--no-sandbox", "--disable-crashpad"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", isMobile: true, hasTouch: true });
await page.goto("http://127.0.0.1:4322/", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.locator("[data-nav-toggle]").click();
await page.waitForTimeout(200);
await page.screenshot({ path: ".screenshots/mobile-menu.png" });
await browser.close();
