import { MOCK_SYSTEM_LIBRARY } from "./mock-data";
import type { AlgoliaContentItem, AlgoliaSearchResult } from "./types";

/**
 * Stub Algolia client that searches mock data in-memory.
 * Replace with real Algolia client when credentials are available.
 */
export async function searchSystemLibrary(
  query: string,
  options?: { category?: string; language?: string; page?: number; hitsPerPage?: number }
): Promise<AlgoliaSearchResult> {
  const { category, language, page = 0, hitsPerPage = 20 } = options ?? {};

  let results = MOCK_SYSTEM_LIBRARY;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  if (category) {
    results = results.filter((item) => item.category === category);
  }

  if (language) {
    results = results.filter((item) => item.language === language);
  }

  const totalHits = results.length;
  const start = page * hitsPerPage;
  const paginatedHits = results.slice(start, start + hitsPerPage);

  return {
    hits: paginatedHits,
    nbHits: totalHits,
    page,
    nbPages: Math.ceil(totalHits / hitsPerPage),
    hitsPerPage,
    query,
  };
}

export function getSystemLibraryCategories(): string[] {
  const categories = new Set(MOCK_SYSTEM_LIBRARY.map((item) => item.category));
  return Array.from(categories).sort();
}

export type { AlgoliaContentItem, AlgoliaSearchResult };
