import { API_URLS } from "../constants.js";

export interface ScrapeResult {
  content: string;
  title: string;
  images: string[];
}

export async function scrapeWithFirecrawl(
  url: string,
  format: "markdown" | "html" | "text" = "markdown",
): Promise<ScrapeResult> {
  const key = process.env.FIRECRAWL_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_KEY not configured");
  }

  const response = await fetch(`${API_URLS.firecrawl}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      url,
      formats: [format],
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const doc = data.data || {};

  return {
    content: doc.markdown || doc.html || doc.text || "",
    title: doc.metadata?.title || "",
    images: (doc.metadata?.images || []) as string[],
  };
}

export function isFirecrawlAvailable(): boolean {
  return !!process.env.FIRECRAWL_KEY;
}
