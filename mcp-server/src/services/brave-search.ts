import { API_URLS, DEFAULTS } from "../constants.js";
import type { SearchResult } from "../types.js";

export async function searchBrave(
  query: string,
  count: number = DEFAULTS.searchCount,
): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_KEY;
  if (!key) {
    throw new Error("BRAVE_SEARCH_KEY not configured. Set it in env or .env.local");
  }

  const url = new URL(API_URLS.braveSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": key,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const results: SearchResult[] = (data.web?.results || []).map((r: any) => ({
    title: r.title || "",
    url: r.url || "",
    description: r.description || "",
  }));

  return results;
}

export async function searchCompetitors(niche: string, count: number = 5): Promise<SearchResult[]> {
  return searchBrave(`${niche} top companies competitors`, count);
}

export async function searchDesignReferences(niche: string, count: number = 5): Promise<SearchResult[]> {
  const queries = [
    `${niche} site:awwwards.com`,
    `${niche} site:dribbble.com`,
    `${niche} site:behance.net`,
  ];

  const allResults: SearchResult[] = [];
  for (const query of queries) {
    try {
      const results = await searchBrave(query, Math.ceil(count / 3));
      allResults.push(...results);
    } catch {
      // Continue with other sources if one fails
    }
  }

  return allResults.slice(0, count);
}
