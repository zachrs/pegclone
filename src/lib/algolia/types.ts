export interface AlgoliaContentItem {
  objectID: string;
  title: string;
  description: string;
  url: string;
  category: string;
  language: string;
  source: string;
}

export interface AlgoliaSearchResult {
  hits: AlgoliaContentItem[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  query: string;
}
