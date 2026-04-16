import { parseBrightStarCatalogCsv } from '../catalog/StarCatalog';
import type { StarData } from '../types';

/**
 * 별 카탈로그(BSC5 등) 데이터를 관리하는 매니저 클래스입니다.
 * 정적 자산 경로에서 CSV를 로드하고 파싱하여 별 데이터를 제공합니다.
 */
export class StarCatalogManager {
  private readonly assetPath: string;
  private catalogPromise: Promise<StarData[]> | null = null;
  private stars: StarData[] = [];

  constructor(assetPath: string) {
    this.assetPath = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
  }

  /**
   * 별 카탈로그 데이터를 비동기로 로드합니다.
   */
  public async load(): Promise<StarData[]> {
    if (this.catalogPromise) {
      return this.catalogPromise;
    }

    const url = `${this.assetPath}star-catalog.csv`;
    this.catalogPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Star catalog fetch failed: ${url} (${response.status})`);
        }
        return response.text();
      })
      .then((csvText) => {
        this.stars = parseBrightStarCatalogCsv(csvText);
        if (this.stars.length === 0) {
          throw new Error('Parsed star catalog is empty');
        }
        return this.stars;
      })
      .catch((error) => {
        this.catalogPromise = null;
        throw error;
      });

    return this.catalogPromise;
  }

  /**
   * 로드된 별 데이터를 반환합니다. 로드되지 않았다면 빈 배열을 반환합니다.
   */
  public getStars(): StarData[] {
    return this.stars;
  }
}
