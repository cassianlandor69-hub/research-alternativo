export interface AgencyNews {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  category: string;
  summary: string | null;
  relevance: number;
}

export interface AgencyPerson {
  id: number;
  name: string;
  role: string;
  roleType: string;
  linkedinUrl: string | null;
  sourceUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface AgencyClient {
  id: number;
  name: string;
  isNotable: boolean;
  sinceYear: number | null;
}

export interface Agency {
  id: number;
  index: number;
  slug: string;
  name: string;
  normalizedName: string;
  legalName: string | null;
  url: string | null;
  domain: string | null;
  classification: string;
  tags: string[];
  aliases: string[];
  groupName: string | null;
  holding: string;
  isIndependent: boolean;
  city: string | null;
  country: string | null;
  foundedYear: number | null;
  description: string | null;
  employees: number | null;
  revenueEur: number | null;
  clout: string | null;
  status: string;
  confidence: number | null;
  sources: string[];
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  people: AgencyPerson[];
  clients: AgencyClient[];
  news: AgencyNews[];
  counts: {
    people: number;
    founders: number;
    directors: number;
    clients: number;
    news: number;
    sources: number;
  };
}

export interface PersonRole {
  agencyId: number;
  agencyName: string;
  agencySlug: string | null;
  role: string;
  roleType: string;
  startedAt: string | null;
  sourceUrl: string | null;
}

export interface Person {
  id: number;
  name: string;
  linkedinUrl: string | null;
  bio: string | null;
  createdAt: string;
  roles: PersonRole[];
  isFounder: boolean;
  agencies: string[];
}

export interface Client {
  id: number;
  name: string;
  sector: string | null;
  agencies: { id: number; name: string; slug: string; classification: string; isNotable: boolean }[];
  agencyCount: number;
}

export interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  discoveredAt: string;
  category: string;
  sentiment: string | null;
  summary: string | null;
  agencies: { id: number; name: string; slug: string; relevance: number }[];
}

export interface Count {
  key: string;
  value: number;
}

export interface Dataset {
  generatedAt: string;
  source: string;
  schemaVersion: string | null;
  stats: {
    agencies: number;
    people: number;
    clients: number;
    news: number;
    agencyPeopleLinks: number;
    agencyClientsLinks: number;
    agencyNewsLinks: number;
    sources: number;
    cities: number;
    classifications: number;
    domains: number;
    founded: number;
    agencyDescriptions: number;
    newsRange: { from: string | null; to: string | null };
    timeline: { from: string; to: string };
  };
  agencies: Agency[];
  people: Person[];
  clients: Client[];
  news: NewsItem[];
  aggregates: {
    byClassification: Count[];
    byHolding: Count[];
    byCity: Count[];
    bySource: Count[];
    byCategory: Count[];
    byRoleType: Count[];
    topRoles: Count[];
    topClients: Client[];
    topConnected: {
      id: number;
      name: string;
      slug: string;
      classification: string;
      city: string | null;
      people: number;
      clients: number;
      news: number;
      score: number;
    }[];
    latestNews: {
      id: number;
      title: string;
      source: string;
      category: string;
      publishedAt: string | null;
      agencies: { id: number; name: string; slug: string; relevance: number }[];
    }[];
    newsByDay: { date: string; value: number }[];
    monthlyNews: { month: string; value: number }[];
    coverage: Record<string, number>;
    quality: { field: string; label: string; fill: number; total: number }[];
  };
  ingest: {
    runs: {
      id: number;
      kind: string;
      mode: string | null;
      startedAt: string;
      finishedAt: string | null;
      summary: string | null;
      stats: Record<string, unknown> | null;
    }[];
    latest: Dataset["ingest"]["runs"][number] | null;
    total: number;
  };
  database: {
    meta: Record<string, string>;
    tables: {
      name: string;
      rowCount: number;
      columns: {
        name: string;
        type: string;
        notNull: boolean;
        pk: boolean;
        defaultValue: string | null;
        references: string | null;
      }[];
    }[];
    views: string[];
    indexes: { name: string; tbl_name: string }[];
    groupNamePresent: number;
  };
}
