import raw from "../data/dataset.json";
import type { Dataset } from "./types";

export const data = raw as unknown as Dataset;

export const palette = [
  "#c9f158",
  "#5cc8ff",
  "#b79cff",
  "#ff8fb1",
  "#ffb454",
  "#4ade80",
  "#f7d046",
  "#a7b0c0",
  "#ff7a7a",
  "#6ee7b7",
  "#93c5fd",
];

type ClassMeta = { label: string; short: string; color: string };

export const CLASS_META: Record<string, ClassMeta> = {
  creative: { label: "Creatividad", short: "CRE", color: "#c9f158" },
  digital: { label: "Digital", short: "DIG", color: "#5cc8ff" },
  media: { label: "Medios", short: "MED", color: "#b79cff" },
  pr_communication: { label: "PR y Comunicación", short: "PR", color: "#ff8fb1" },
  btl_activation: { label: "BTL y Activación", short: "BTL", color: "#ffb454" },
  healthcare: { label: "Salud", short: "SAL", color: "#4ade80" },
  branding_design: { label: "Branding y Diseño", short: "BRD", color: "#f7d046" },
  inhouse_external: { label: "In-house / Externo", short: "IHX", color: "#a7b0c0" },
  social_influence: { label: "Social e Influencia", short: "SOC", color: "#ff7a7a" },
};

export function classMeta(key: string): ClassMeta {
  return CLASS_META[key] ?? { label: key.replaceAll("_", " "), short: key.slice(0, 3).toUpperCase(), color: "#a7b0c0" };
}

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  appointment: { label: "Nombramiento", color: "#5cc8ff" },
  pitch: { label: "Concurso ganado", color: "#c9f158" },
  campaign: { label: "Campaña", color: "#b79cff" },
  award: { label: "Premio", color: "#f7d046" },
  financial: { label: "Finanzas", color: "#ffb454" },
  "m&a": { label: "Fusiones y adquisiciones", color: "#ff8fb1" },
  other: { label: "Otros", color: "#8b93a7" },
};

export function categoryMeta(key: string) {
  return CATEGORY_META[key] ?? { label: key, color: "#8b93a7" };
}

const SOURCE_LABELS: Record<string, string> = {
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

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

export const ROLE_TYPE_LABEL: Record<string, string> = {
  founder: "Fundador/a",
  director: "Director/a",
  partner: "Socio/a",
};

export function roleTypeLabel(key: string) {
  return ROLE_TYPE_LABEL[key] ?? key;
}

export function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES").format(n);
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function fmtDate(iso: string | null | undefined, style: "short" | "long" | "mono" = "short") {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  if (style === "long") {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  if (style === "mono") {
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase();
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function dateParts(iso: string | null | undefined) {
  if (!iso) return { day: "—", month: "SIN FECHA", year: "" };
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return { day: "—", month: "", year: "" };
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: d.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).toUpperCase(),
    year: String(d.getUTCFullYear()),
  };
}

export function fmtMonth(month: string) {
  const d = new Date(`${month}-01T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function hostname(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N}\s&]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarStyle(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  const hue = hash;
  return `background: linear-gradient(135deg, hsl(${hue} 55% 24%), hsl(${(hue + 48) % 360} 60% 42%));`;
}

export function plural(n: number, singular: string, pluralForm?: string) {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`);
}

export function safeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export const NAV = [
  { href: "/", label: "Resumen", key: "overview" },
  { href: "/agencias/", label: "Agencias", key: "agencies" },
  { href: "/personas/", label: "Personas", key: "people" },
  { href: "/clientes/", label: "Clientes", key: "clients" },
  { href: "/noticias/", label: "Noticias", key: "news" },
  { href: "/datos/", label: "Datos", key: "data" },
];
