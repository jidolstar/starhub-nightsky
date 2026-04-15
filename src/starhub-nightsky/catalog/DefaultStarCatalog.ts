const DEFAULT_STAR_CATALOG_URL = new URL('../data/bsc5p.csv', import.meta.url);

let defaultStarCatalogCsvTextPromise: Promise<string> | null = null;

export function loadBundledStarCatalogCsvText(): Promise<string> {
  if (!defaultStarCatalogCsvTextPromise) {
    defaultStarCatalogCsvTextPromise = fetch(DEFAULT_STAR_CATALOG_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`Bundled star catalog fetch failed: ${response.status}`);
      }

      return response.text();
    }).catch((error) => {
      defaultStarCatalogCsvTextPromise = null;
      throw error;
    });
  }

  return defaultStarCatalogCsvTextPromise;
}
