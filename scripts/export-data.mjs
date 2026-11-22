#!/usr/bin/env node
/*
 * Export agencies.db into a fully static dataset consumed by the Astro build.
 * - src/data/dataset.json : complete, relation-resolved dataset
 * - public/dataset.json   : downloadable copy
 * - public/search.json    : compact index for the ⌘K palette
 */
import { DatabaseSync } from "node:sqlite";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(root, "agencies.db");
const db = new DatabaseSync(dbPath, { readOnly: true });

const all = (sql) => db.prepare(sql).all();
const one = (sql) => db.prepare(sql).get();

const safeJson = (value, fallback = []) => {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const slugify = (input) =>
  String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "agency";

const CLASS_LABELS = {
  creative: "Creatividad",
  digital: "Digital",
  media: "Medios",
  pr_communication: "PR y Comunicación",
  btl_activation: "BTL y Activación",
  healthcare: "Salud",
  branding_design: "Branding y Diseño",
  inhouse_external: "In-house / Externo",
  social_influence: "Social e Influencia",
};

const CATEGORY_LABELS = {
  appointment: "Nombramiento",
  pitch: "Concurso ganado",
  campaign: "Campaña",
  award: "Premio",
  financial: "Finanzas",
  "m&a": "Fusiones y adquisiciones",
  other: "Otros",
};

const SOURCE_NAMES = {
  dircomfidencial: "Dircomfidencial",
  marketingdirecto: "MarketingDirecto",
  elpublicitario: "El Publicitario",
  anuncios: "Anuncios",
  ipmark: "IPMARK",
  reasonwhy: "Reason Why",
  controlpublicidad: "Control Publicidad",
  periodicopublicidad: "Periódico Publicidad",
  extradigital: "ExtraDigital",
  puromarketing: "PuroMarketing",
  scopen: "SCOPEN",
};

const searchDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${iso.slice(0, 10)}T12:00:00Z`),
      )
    : "sin fecha";

const groupParents = [
  { key: "WPP", label: "WPP", re: /wpp|ogilvy|vml/i },
  { key: "Omnicom", label: "Omnicom", re: /omnicom|bbdo|dentsu\b/i },
  { key: "Publicis", label: "Publicis", re: /publicis/i },
  { key: "IPG", label: "IPG", re: /ipg|mullenlowe|mediabrands/i },
  { key: "Havas", label: "Havas", re: /havas/i },
  { key: "Dentsu", label: "Dentsu", re: /dentsu/i },
];

function holdingOf(groupName) {
  if (!groupName) return "Independent / no group";
  for (const g of groupParents) {
    if (g.re.test(groupName)) return g.label;
  }
  return "Other group";
}

const rawAgencies = all(`
  SELECT * FROM agencies ORDER BY name COLLATE NOCASE
`);
const rawPeople = all(`SELECT * FROM people ORDER BY name COLLATE NOCASE`);
const rawClients = all(`SELECT * FROM clients ORDER BY name COLLATE NOCASE`);
const rawNews = all(`SELECT * FROM news ORDER BY published_at DESC, id DESC`);
const agencyPeople = all(`
  SELECT ap.agency_id, ap.person_id, ap.role, ap.role_type, ap.started_at, ap.ended_at, ap.source_url
  FROM agency_people ap
`);
const agencyClients = all(`SELECT * FROM agency_clients`);
const agencyNews = all(`SELECT * FROM agency_news`);

function cleanSummary(raw) {
  if (!raw) return null;
  let text = String(raw)
    .replace(/<\?xml[\s\S]*?\?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/^[-–—:;,.]+\s*/, "").trim();
  if (text.length < 40) return null;
  if (/^\p{Ll}/u.test(text)) return null;
  if (/^\d{1,2}\s+de\s+\p{L}+\s+de\s+\d{4}$/iu.test(text)) return null;
  if (/^leer m[aá]s/i.test(text)) return null;
  if (/^(compartir|publicidad|suscripci[oó]n)\b/i.test(text)) return null;
  return text;
}

const peopleById = new Map(rawPeople.map((p) => [p.id, p]));
const clientsById = new Map(rawClients.map((c) => [c.id, c]));
const newsById = new Map(rawNews.map((n) => [n.id, n]));

const slugCounts = new Map();
function uniqueSlug(name) {
  const base = slugify(name);
  const seen = slugCounts.get(base) ?? 0;
  slugCounts.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

const peopleByAgency = new Map();
for (const row of agencyPeople) {
  const person = peopleById.get(row.person_id);
  if (!person) continue;
  const list = peopleByAgency.get(row.agency_id) ?? [];
  list.push({
    id: person.id,
    name: person.name,
    role: row.role,
    roleType: row.role_type,
    linkedinUrl: person.linkedin_url || null,
    sourceUrl: row.source_url || null,
    startedAt: row.started_at || null,
    endedAt: row.ended_at || null,
  });
  peopleByAgency.set(row.agency_id, list);
}

const clientsByAgency = new Map();
for (const row of agencyClients) {
  const client = clientsById.get(row.client_id);
  if (!client) continue;
  const list = clientsByAgency.get(row.agency_id) ?? [];
  list.push({
    id: client.id,
    name: client.name,
    isNotable: Boolean(row.is_notable),
    sinceYear: row.since_year || null,
  });
  clientsByAgency.set(row.agency_id, list);
}

const newsByAgency = new Map();
for (const row of agencyNews) {
  const item = newsById.get(row.news_id);
  if (!item) continue;
  const list = newsByAgency.get(row.agency_id) ?? [];
  list.push({
    id: item.id,
    title: item.title,
    url: item.url,
    source: item.source,
    publishedAt: item.published_at || null,
    category: item.category || "other",
    summary: cleanSummary(item.summary),
    relevance: row.relevance ?? 1,
  });
  newsByAgency.set(row.agency_id, list);
}

const agencies = rawAgencies.map((a, index) => {
  const people = (peopleByAgency.get(a.id) ?? []).sort((x, y) =>
    x.roleType === y.roleType ? x.name.localeCompare(y.name) : x.roleType === "founder" ? -1 : 1,
  );
  const clients = (clientsByAgency.get(a.id) ?? []).sort((x, y) =>
    x.name.localeCompare(y.name, "es"),
  );
  const news = (newsByAgency.get(a.id) ?? []).sort((x, y) =>
    String(y.publishedAt ?? "").localeCompare(String(x.publishedAt ?? "")),
  );
  const sources = safeJson(a.sources).filter((s) => /^https?:\/\//.test(String(s)));
  const tags = safeJson(a.classification_tags).filter((t) => t && t !== "i");
  return {
    id: a.id,
    index: index + 1,
    slug: uniqueSlug(a.name),
    name: a.name,
    normalizedName: a.name_normalized,
    legalName: a.legal_name || null,
    url: a.url || null,
    domain: a.domain || null,
    classification: a.classification,
    tags,
    aliases: safeJson(a.aliases),
    groupName: a.group_name || null,
    holding: holdingOf(a.group_name),
    isIndependent: Boolean(a.is_independent),
    city: a.city || null,
    country: a.country || null,
    foundedYear: a.founded_year || null,
    description: a.description || null,
    employees: a.employees || null,
    revenueEur: a.revenue_eur || null,
    clout: a.clout || null,
    status: a.status || "active",
    confidence: a.confidence ?? null,
    sources,
    lastSeenAt: a.last_seen_at || null,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    people,
    clients,
    news,
    counts: {
      people: people.length,
      founders: people.filter((p) => p.roleType === "founder").length,
      directors: people.filter((p) => p.roleType === "director").length,
      clients: clients.length,
      news: news.length,
      sources: sources.length,
    },
  };
});

const agencyBySlug = new Map(agencies.map((a) => [a.slug, a]));

const people = rawPeople.map((p) => {
  const roles = agencyPeople
    .filter((r) => r.person_id === p.id)
    .map((r) => {
      const agency = agencies.find((a) => a.id === r.agency_id);
      return {
        agencyId: r.agency_id,
        agencyName: agency?.name ?? "—",
        agencySlug: agency?.slug ?? null,
        role: r.role,
        roleType: r.role_type,
        startedAt: r.started_at || null,
        sourceUrl: r.source_url || null,
      };
    })
    .sort((a, b) => a.agencyName.localeCompare(b.agencyName, "es"));
  return {
    id: p.id,
    name: p.name,
    linkedinUrl: p.linkedin_url || null,
    bio: p.bio || null,
    createdAt: p.created_at,
    roles,
    isFounder: roles.some((r) => r.roleType === "founder"),
    agencies: [...new Set(roles.map((r) => r.agencyName))],
  };
});

const clients = rawClients.map((c) => {
  const links = agencyClients.filter((l) => l.client_id === c.id);
  const linkedAgencies = links
    .map((l) => agencies.find((a) => a.id === l.agency_id))
    .filter(Boolean)
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      classification: a.classification,
      isNotable: Boolean(links.find((l) => l.agency_id === a.id)?.is_notable),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return {
    id: c.id,
    name: c.name,
    sector: c.sector || null,
    agencies: linkedAgencies,
    agencyCount: linkedAgencies.length,
  };
});

const news = rawNews.map((n) => {
  const linked = agencyNews
    .filter((l) => l.news_id === n.id)
    .map((l) => agencies.find((a) => a.id === l.agency_id))
    .filter(Boolean)
    .map((a) => ({ id: a.id, name: a.name, slug: a.slug, relevance: 1 }));
  return {
    id: n.id,
    title: n.title,
    url: n.url,
    source: n.source,
    publishedAt: n.published_at || null,
    discoveredAt: n.discovered_at,
    category: n.category || "other",
    sentiment: n.sentiment || null,
    summary: cleanSummary(n.summary),
    agencies: linked,
  };
});

// ---------- aggregates ----------
const countBy = (items, keyFn) => {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, value]) => ({ key, value }));
};

const byClassification = countBy(agencies, (a) => a.classification).sort((a, b) => b.value - a.value);
const byHolding = countBy(agencies, (a) => a.holding).sort((a, b) => b.value - a.value);
const byCity = countBy(agencies, (a) => a.city ?? "Not listed").sort((a, b) => b.value - a.value);
const bySource = countBy(news, (n) => n.source).sort((a, b) => b.value - a.value);
const byCategory = countBy(news, (n) => n.category).sort((a, b) => b.value - a.value);
const byRoleType = countBy(people.flatMap((p) => p.roles), (r) => r.roleType).sort(
  (a, b) => b.value - a.value,
);
const topRoles = countBy(
  people.flatMap((p) => p.roles),
  (r) => r.role,
)
  .sort((a, b) => b.value - a.value)
  .slice(0, 8);
const topClients = [...clients].sort((a, b) => b.agencyCount - a.agencyCount || a.name.localeCompare(b.name, "es")).slice(0, 10);

const datedNews = news.filter((n) => n.publishedAt);
const minNewsDate = datedNews.reduce((m, n) => (!m || n.publishedAt < m ? n.publishedAt : m), null);
const maxNewsDate = datedNews.reduce((m, n) => (!m || n.publishedAt > m ? n.publishedAt : m), null);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const timelineStart = "2026-10-01";
const timelineEnd = maxNewsDate ?? "2026-11-21";
const newsByDay = [];
{
  const counts = new Map(countBy(datedNews, (n) => n.publishedAt).map((d) => [d.key, d.value]));
  for (let i = 0; i <= daysBetween(timelineStart, timelineEnd); i++) {
    const d = new Date(Date.parse(`${timelineStart}T00:00:00Z`) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    newsByDay.push({ date: d, value: counts.get(d) ?? 0 });
  }
}

const monthlyNews = countBy(datedNews, (n) => n.publishedAt.slice(0, 7))
  .sort((a, b) => a.key.localeCompare(b.key))
  .map(({ key, value }) => ({ month: key, value }));

const agenciesWith = (fn) => agencies.filter(fn).length;
const coverage = {
  people: agenciesWith((a) => a.counts.people > 0),
  clients: agenciesWith((a) => a.counts.clients > 0),
  news: agenciesWith((a) => a.counts.news > 0),
  description: agenciesWith((a) => Boolean(a.description)),
  domain: agenciesWith((a) => Boolean(a.domain)),
  clout: agenciesWith((a) => Boolean(a.clout)),
  foundedYear: agenciesWith((a) => Boolean(a.foundedYear)),
  employees: agenciesWith((a) => Boolean(a.employees)),
  revenue: agenciesWith((a) => Boolean(a.revenueEur)),
  sources: agenciesWith((a) => a.counts.sources > 0),
};

const topConnected = [...agencies]
  .map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    classification: a.classification,
    city: a.city,
    people: a.counts.people,
    clients: a.counts.clients,
    news: a.counts.news,
    score: a.counts.people + a.counts.clients + a.counts.news,
  }))
  .sort((a, b) => b.score - a.score || b.clients - a.clients || a.name.localeCompare(b.name))
  .slice(0, 8);

const storyWords = (title) =>
  new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
const similarStory = (a, b) => {
  const overlap = [...a].filter((w) => b.has(w)).length;
  return overlap / Math.min(a.size, b.size) > 0.72;
};

const latestNews = [];
for (const n of [...datedNews].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id - a.id)) {
  const words = storyWords(n.title);
  if (latestNews.some((x) => similarStory(words, x.words))) continue;
  latestNews.push({
    id: n.id,
    title: n.title,
    source: n.source,
    category: n.category,
    publishedAt: n.publishedAt,
    agencies: n.agencies.slice(0, 2),
    words,
  });
  if (latestNews.length === 5) break;
}
latestNews.forEach((n) => delete n.words);

const stats = {
  agencies: agencies.length,
  people: people.length,
  clients: clients.length,
  news: news.length,
  agencyPeopleLinks: agencyPeople.length,
  agencyClientsLinks: agencyClients.length,
  agencyNewsLinks: agencyNews.length,
  sources: bySource.length,
  cities: new Set(agencies.map((a) => a.city).filter(Boolean)).size,
  classifications: byClassification.length,
  domains: new Set(agencies.map((a) => a.domain).filter(Boolean)).size,
  founded: agenciesWith((a) => Boolean(a.foundedYear)),
  agencyDescriptions: coverage.description,
  newsRange: { from: minNewsDate, to: maxNewsDate },
  timeline: { from: timelineStart, to: timelineEnd },
};

const tableNames = all(`
  SELECT name, type FROM sqlite_master
  WHERE type IN ('table') AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`);
const tables = tableNames.map(({ name }) => {
  const columns = all(`PRAGMA table_info("${name}")`);
  const foreignKeys = all(`PRAGMA foreign_key_list("${name}")`);
  const rowCount = one(`SELECT COUNT(*) AS n FROM "${name}"`).n;
  return {
    name,
    rowCount,
    columns: columns.map((c) => ({
      name: c.name,
      type: c.type,
      notNull: Boolean(c.notnull),
      pk: Boolean(c.pk),
      defaultValue: c.dflt_value,
      references: foreignKeys.find((fk) => fk.from === c.name)?.table ?? null,
    })),
  };
});

const runs = all(`
  SELECT id, kind, started_at, finished_at, mode, summary, stats
  FROM ingest_runs ORDER BY id DESC
`).map((r) => {
  let stats = null;
  try {
    stats = r.stats ? JSON.parse(r.stats) : null;
  } catch {
    stats = null;
  }
  return {
    id: r.id,
    kind: r.kind,
    mode: r.mode,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    summary: r.summary,
    stats,
  };
});

const meta = Object.fromEntries(all(`SELECT key, value FROM meta`).map((r) => [r.key, r.value]));

const agencyGroupCount = agencies.filter((a) => a.groupName).length;

const quality = [
  { field: "description", label: "Descripción", fill: coverage.description, total: agencies.length },
  { field: "domain", label: "Web", fill: coverage.domain, total: agencies.length },
  { field: "sources", label: "Fuentes citadas", fill: coverage.sources, total: agencies.length },
  { field: "clout", label: "Premios / reputación", fill: coverage.clout, total: agencies.length },
  { field: "group_name", label: "Nombre del grupo", fill: agencyGroupCount, total: agencies.length },
  { field: "founded_year", label: "Año de fundación", fill: coverage.foundedYear, total: agencies.length },
  { field: "employees", label: "Empleados", fill: coverage.employees, total: agencies.length },
  { field: "revenue_eur", label: "Ingresos (EUR)", fill: coverage.revenue, total: agencies.length },
];

const dataset = {
  generatedAt: new Date().toISOString(),
  source: "agencies.db",
  schemaVersion: meta.schema_version ?? null,
  stats,
  agencies,
  people,
  clients,
  news,
  aggregates: {
    byClassification,
    byHolding,
    byCity,
    bySource,
    byCategory,
    byRoleType,
    topRoles,
    topClients,
    topConnected,
    latestNews,
    newsByDay,
    monthlyNews,
    coverage,
    quality,
  },
  ingest: {
    runs,
    latest: runs[0] ?? null,
    total: runs.length,
  },
  database: {
    meta,
    tables,
    views: all(`SELECT name FROM sqlite_master WHERE type IN ('view') ORDER BY name`).map((v) => v.name),
    indexes: all(`SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name`),
    groupNamePresent: agencyGroupCount,
  },
};

await mkdir(path.join(root, "src", "data"), { recursive: true });
await mkdir(path.join(root, "public"), { recursive: true });

const compact = JSON.stringify(dataset);
await writeFile(path.join(root, "src", "data", "dataset.json"), compact);
await writeFile(path.join(root, "public", "dataset.json"), JSON.stringify(dataset, null, 2));

const searchIndex = {
  generatedAt: dataset.generatedAt,
  agencies: agencies.map((a) => ({
    slug: a.slug,
    name: a.name,
    sub: [CLASS_LABELS[a.classification] ?? a.classification, a.city].filter(Boolean).join(" · "),
    terms: [
      a.name,
      ...a.aliases,
      a.description,
      a.classification,
      CLASS_LABELS[a.classification],
      a.city,
      a.groupName,
      ...a.tags,
      ...a.clients.map((c) => c.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  })),
  people: people.map((p) => ({
    id: p.id,
    name: p.name,
    sub: [...new Set(p.roles.map((r) => r.role))].slice(0, 2).join(" · ") || "Person",
    terms: [p.name, ...p.roles.map((r) => `${r.role} ${r.agencyName}`)].join(" ").toLowerCase(),
  })),
  clients: clients.map((c) => ({
    id: c.id,
    name: c.name,
    sub: `${c.agencyCount} ${c.agencyCount === 1 ? "agencia" : "agencias"}`,
    terms: [c.name, ...c.agencies.map((a) => a.name)].join(" ").toLowerCase(),
  })),
  news: news.map((n) => ({
    id: n.id,
    name: n.title,
    sub: `${SOURCE_NAMES[n.source] ?? n.source} · ${searchDate(n.publishedAt)}`,
    terms: [n.title, n.summary, n.source, n.category, CATEGORY_LABELS[n.category], ...n.agencies.map((a) => a.name)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  })),
};
await writeFile(path.join(root, "public", "search.json"), JSON.stringify(searchIndex));
await copyFile(dbPath, path.join(root, "public", "agencies.db"));

console.log(
  `Exported ${stats.agencies} agencies · ${stats.people} people · ${stats.clients} clients · ${stats.news} news → src/data/dataset.json (${(compact.length / 1024).toFixed(0)} KB)`,
);
