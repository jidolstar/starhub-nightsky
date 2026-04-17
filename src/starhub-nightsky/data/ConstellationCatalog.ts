import { type ConstellationDefinition } from './Constellations';

/**
 * 별자리 카탈로그 행 데이터 인터페이스
 */
export interface ConstellationCatalogRow {
  abbr: string;
  nameEn: string;
  nameKo: string;
  raDeg: number;
  decDeg: number;
}

/**
 * 별자리 기본 정보를 관리하는 데이터 매니저 클래스입니다.
 * 별자리 이름, 표시 위치 등을 담당하며, 다른 리소스(선, 경계선) 로딩의 기초가 됩니다.
 */
export class ConstellationCatalog {
  private readonly assetPath: string;
  private catalogPromise: Promise<ConstellationCatalogRow[]> | null = null;
  private rows: ConstellationCatalogRow[] = [];

  constructor(assetPath: string) {
    this.assetPath = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
  }

  /**
   * 카탈로그 데이터를 비동기로 로드합니다.
   * 이미 로드되었거나 로딩 중인 경우 기존 Promise를 반환합니다.
   */
  public async load(): Promise<ConstellationCatalogRow[]> {
    if (this.catalogPromise) {
      return this.catalogPromise;
    }

    const url = `${this.assetPath}constellation-catalog.csv`;
    this.catalogPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Constellation catalog fetch failed: ${url} (${response.status})`);
        }
        return response.text();
      })
      .then((csvText) => {
        this.rows = this.parseCatalogCsv(csvText);
        return this.rows;
      })
      .catch((error) => {
        this.catalogPromise = null;
        throw error;
      });

    return this.catalogPromise;
  }

  public getRows(): ConstellationCatalogRow[] {
    return this.rows;
  }

  /**
   * 카탈로그 행과 외부 데이터를 조합하여 별자리 정의를 생성합니다.
   */
  public buildDefinitions(
    rows: readonly ConstellationCatalogRow[],
    lineDataMap?: Map<string, [number, number][][]>
  ): ConstellationDefinition[] {
    return rows.map((row) => {
      return {
        id: row.abbr,
        englishName: row.nameEn,
        koreanName: row.nameKo,
        label: [row.raDeg, row.decDeg],
        lines: lineDataMap?.get(row.abbr) || [],
      };
    });
  }

  private parseCatalogCsv(csvText: string): ConstellationCatalogRow[] {
    const lines = csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const abbrIndex = headers.indexOf('abbr');
    const nameEnIndex = headers.indexOf('name_en');
    const nameKoIndex = headers.indexOf('name_ko');
    const raIndex = headers.indexOf('ra_deg');
    const decIndex = headers.indexOf('dec_deg');

    if (abbrIndex < 0 || nameEnIndex < 0 || nameKoIndex < 0 || raIndex < 0 || decIndex < 0) {
      return [];
    }

    const rows: ConstellationCatalogRow[] = [];
    for (const line of lines.slice(1)) {
      const fields = this.parseCsvLine(line);
      const abbr = (fields[abbrIndex] ?? '').trim();
      const nameEn = (fields[nameEnIndex] ?? '').trim();
      const nameKo = (fields[nameKoIndex] ?? '').trim();
      const raDeg = this.parseNumber(fields[raIndex] ?? '');
      const decDeg = this.parseNumber(fields[decIndex] ?? '');

      if (!abbr || !Number.isFinite(raDeg) || !Number.isFinite(decDeg)) continue;
      rows.push({ abbr, nameEn, nameKo, raDeg, decDeg });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    fields.push(current);
    return fields.map((v) => v.trim());
  }

  private parseNumber(value: string): number {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

}
