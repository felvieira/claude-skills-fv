// Playwright is used via the Playwright MCP that the client already has configured.
// This service provides helper functions for building Playwright-compatible instructions
// that the LLM can execute via the Playwright MCP tools.

import { DEFAULTS } from "../constants.js";

export interface ScreenshotInstruction {
  url: string;
  fullPage: boolean;
  viewport: { width: number; height: number };
  description: string;
}

export function buildScreenshotInstruction(
  url: string,
  fullPage: boolean = true,
  viewport?: { width: number; height: number },
): ScreenshotInstruction {
  return {
    url,
    fullPage,
    viewport: viewport || DEFAULTS.screenshotViewport,
    description: `Navigate to ${url} and take a ${fullPage ? "full-page" : "viewport"} screenshot`,
  };
}

export interface ImageExtractionInstruction {
  url: string;
  selector: string;
  limit: number;
  description: string;
}

export function buildImageExtractionInstruction(
  url: string,
  selector: string = "img",
  limit: number = DEFAULTS.maxImages,
): ImageExtractionInstruction {
  return {
    url,
    selector,
    limit,
    description: `Navigate to ${url}, query all '${selector}' elements, extract src and alt attributes (limit ${limit})`,
  };
}

export function buildScrapeInstruction(url: string): {
  url: string;
  description: string;
} {
  return {
    url,
    description: `Navigate to ${url}, extract page title and main text content as markdown`,
  };
}
