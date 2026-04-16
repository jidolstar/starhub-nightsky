/**
 * 별자리 경계선 점 좌표 [ra, dec]
 */
export type ConstellationBoundaryPoint = readonly [ra: number, dec: number];

/**
 * 별자리 경계선 정의 인터페이스
 */
export interface ConstellationBoundaryDefinition {
  id: string;
  loops: readonly (readonly ConstellationBoundaryPoint[])[];
}

/**
 * IAU 별자리 경계선 데이터를 관리하는 매니저 클래스입니다.
 * constellation-boundaries.csv 파일에서 데이터를 로드합니다.
 */
export class ConstellationBoundaries {
  private readonly assetPath: string;
  private boundariesPromise: Promise<ConstellationBoundaryDefinition[]> | null = null;
  private boundaries: ConstellationBoundaryDefinition[] = [];

  constructor(assetPath: string) {
    this.assetPath = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
  }

  /**
   * 별자리 경계선 데이터를 비동기로 로드합니다.
   */
  public async load(): Promise<ConstellationBoundaryDefinition[]> {
    if (this.boundariesPromise) {
      return this.boundariesPromise;
    }

    const url = `${this.assetPath}constellation-boundaries.csv`;
    this.boundariesPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Constellation boundaries fetch failed: ${url} (${response.status})`);
        }
        return response.text();
      })
      .then((csvText) => {
        this.boundaries = this.parseBoundariesCsv(csvText);
        return this.boundaries;
      })
      .catch((error) => {
        this.boundariesPromise = null;
        throw error;
      });

    return this.boundariesPromise;
  }

  public getBoundaries(): ConstellationBoundaryDefinition[] {
    return this.boundaries;
  }

  private parseBoundariesCsv(csvText: string): ConstellationBoundaryDefinition[] {
    const lines = csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const boundariesMap = new Map<string, Map<number, ConstellationBoundaryPoint[]>>();

    // 헤더: abbr,ra,dec,loop_index
    for (const lineText of lines.slice(1)) {
      const fields = lineText.split(',');
      if (fields.length < 4) continue;

      const abbr = fields[0].trim();
      const ra = Number.parseFloat(fields[1]);
      const dec = Number.parseFloat(fields[2]);
      const loopIdx = Number.parseInt(fields[3], 10);

      if (!abbr || !Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(loopIdx)) {
        continue;
      }

      if (!boundariesMap.has(abbr)) {
        boundariesMap.set(abbr, new Map());
      }
      const loopsMap = boundariesMap.get(abbr)!;
      if (!loopsMap.has(loopIdx)) {
        loopsMap.set(loopIdx, []);
      }
      loopsMap.get(loopIdx)!.push([ra, dec]);
    }

    const results: ConstellationBoundaryDefinition[] = [];
    for (const [id, loopsMap] of boundariesMap) {
      // loop_index 순서대로 정렬하여 loops 배열 생성
      const sortedLoopIndices = Array.from(loopsMap.keys()).sort((a, b) => a - b);
      const loops = sortedLoopIndices.map((idx) => loopsMap.get(idx)!);
      results.push({ id, loops });
    }

    return results;
  }
}
