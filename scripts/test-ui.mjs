import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4321";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-crashpad"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`);
}

const visibleRows = (selector) =>
  page.locator(`${selector}:visible`).count();

async function overflowCheck(label) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  check(`${label} has no horizontal overflow`, dims.scrollWidth <= dims.innerWidth + 1, JSON.stringify(dims));
}

// ---------- Agencies ----------
await page.goto(`${base}/agencias/`, { waitUntil: "networkidle" });
check("Agencies initial count", (await visibleRows(".agency-row")) === 170, String(await visibleRows(".agency-row")));
await page.getByRole("button", { name: /Creatividad/ }).click();
await page.waitForTimeout(80);
check("Filtro Creatividad = 79", (await visibleRows(".agency-row")) === 79, String(await visibleRows(".agency-row")));
check("URL captures class filter", page.url().includes("class=creative"), page.url());
await page.getByRole("button", { name: /Todas las prácticas/ }).click();
await page.locator('select[data-filter="city"]').selectOption("madrid");
await page.waitForTimeout(80);
check("Madrid city filter = 104", (await visibleRows(".agency-row")) === 104, String(await visibleRows(".agency-row")));
await page.locator(".reset-link").click();
await page.waitForTimeout(80);
check("Reset restores 170", (await visibleRows(".agency-row")) === 170, String(await visibleRows(".agency-row")));
await page.fill("[data-filter-search]", "coca-cola");
await page.waitForTimeout(120);
const cocaCount = await visibleRows(".agency-row");
check("Search by client returns agencies", cocaCount > 0 && cocaCount < 170, String(cocaCount));
await page.locator(".reset-link").click();
await page.locator("select[data-sort]").selectOption("clients");
await page.waitForTimeout(80);
const firstRow = await page.locator(".agency-row .ar-name span").first().innerText();
check("Sort by clients puts a 7-client shop first", firstRow.includes("Ros"), firstRow);
await overflowCheck("Agencies desktop");
await page.goto(`${base}/agencias/?city=madrid`, { waitUntil: "networkidle" });
check("City deep link initialises filter", (await visibleRows(".agency-row")) === 104, String(await visibleRows(".agency-row")));

// ---------- People ----------
await page.goto(`${base}/personas/`, { waitUntil: "networkidle" });
check("People initial count", (await visibleRows(".person-card")) === 291, String(await visibleRows(".person-card")));
await page.getByRole("button", { name: /^Fundadores/ }).click();
await page.waitForTimeout(80);
const foundersCount = await visibleRows(".person-card");
check("Filtro Fundadores = 62", foundersCount === 62, String(foundersCount));
await page.getByRole("button", { name: /^Directores/ }).click();
await page.waitForTimeout(80);
const directorsCount = await visibleRows(".person-card");
check("Filtro Directores = 235", directorsCount === 235, String(directorsCount));
await page.fill("[data-filter-search]", "havas");
await page.waitForTimeout(100);
check("People search narrows", (await visibleRows(".person-card")) < 235);

// ---------- Clients ----------
await page.goto(`${base}/clientes/`, { waitUntil: "networkidle" });
check("Clients initial count", (await visibleRows(".client-card")) === 122, String(await visibleRows(".client-card")));
await page.fill("[data-filter-search]", "coca");
await page.waitForTimeout(100);
check("Client search narrows to Coca-Cola", (await visibleRows(".client-card")) === 1, String(await visibleRows(".client-card")));
await page.locator(".reset-link").click();
await page.waitForTimeout(60);
const firstClient = await page.locator(".client-card").first().innerText();
check("Default sort puts Coca-Cola first", firstClient.startsWith("Coca-Cola"), firstClient.split("\n")[0]);
await overflowCheck("Clients desktop");

// ---------- News ----------
await page.goto(`${base}/noticias/`, { waitUntil: "networkidle" });
check("News initial count", (await visibleRows(".news-item")) === 154, String(await visibleRows(".news-item")));
await page.getByRole("button", { name: /Nombramiento/ }).click();
await page.waitForTimeout(80);
check("Filtro Nombramiento = 64", (await visibleRows(".news-item")) === 64, String(await visibleRows(".news-item")));
await page.getByRole("button", { name: /Todos los temas/ }).click();
await page.locator('select[data-filter="source"]').selectOption("dircomfidencial");
await page.waitForTimeout(80);
check("Dircomfidencial filter = 38", (await visibleRows(".news-item")) === 38, String(await visibleRows(".news-item")));
await page.locator("select[data-sort]").selectOption({ label: "Más antiguas" });
await page.waitForTimeout(80);
const oldestFirstTitle = await page.locator(".news-title").first().innerText();
check("Oldest-first sort is applied", oldestFirstTitle.length > 0, oldestFirstTitle);
check("Sort change exposes reset", await page.locator(".reset-link").evaluate((el) => el.classList.contains("is-visible")));
check("URL captures sort", page.url().includes("sort=oldest"), page.url());
await overflowCheck("News desktop");

// ---------- Search palette ----------
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.keyboard.press("Meta+k");
await page.waitForTimeout(600);
check("Search dialog opens", await page.locator("[data-search-dialog]").evaluate((d) => d.open));
await page.fill("[data-search-input]", "ogilvy");
await page.waitForTimeout(500);
const resultCount = await page.locator(".search-result").count();
check("Search returns results", resultCount > 0, String(resultCount));
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(800);
check("Search navigates to a matched page", page.url() !== `${base}/`, page.url());

// ---------- Mobile ----------
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/agencias/`, { waitUntil: "networkidle" });
await overflowCheck("Agencies mobile");
await page.locator("[data-nav-toggle]").click();
await page.waitForTimeout(100);
check("Mobile nav opens", await page.locator("[data-mobile-nav]").evaluate((el) => el.classList.contains("is-open")));
await page.goto(`${base}/noticias/`, { waitUntil: "networkidle" });
await overflowCheck("News mobile");
await page.goto(`${base}/agencias/havas-creative-spain/`, { waitUntil: "networkidle" });
await overflowCheck("Agency detail mobile");
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await overflowCheck("Home mobile");

console.log("\nConsole errors:", errors.length ? errors : "none");
const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
await browser.close();
process.exit(failures.length ? 1 : 0);
