/**
 * 별자리선 데이터를 관리하는 매니저 클래스입니다.
 * 별자리 약자(abbr)를 키로 하여 선 좌표 목록을 관리합니다.
 */
export class ConstellationLines {
  private readonly assetPath: string;
  private linesPromise: Promise<Map<string, [number, number][][]>> | null = null;
  private lineMap: Map<string, [number, number][][]> = new Map();

  constructor(assetPath: string) {
    this.assetPath = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
  }

  /**
   * 별자리선 데이터를 비동기로 로드합니다.
   */
  public async load(): Promise<Map<string, [number, number][][]>> {
    if (this.linesPromise) {
      return this.linesPromise;
    }

    const url = `${this.assetPath}constellation-lines.csv`;
    this.linesPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Constellation lines fetch failed: ${url} (${response.status})`);
        }
        return response.text();
      })
      .then((csvText) => {
        this.lineMap = this.parseLinesCsv(csvText);
        return this.lineMap;
      })
      .catch((error) => {
        this.linesPromise = null;
        throw error;
      });

    return this.linesPromise;
  }

  public getLineMap(): Map<string, [number, number][][]> {
    return this.lineMap;
  }

  private parseLinesCsv(csvText: string): Map<string, [number, number][][]> {
    const lines = csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const map = new Map<string, [number, number][][]>();
    if (lines.length < 2) return map;

    for (const lineText of lines.slice(1)) {
      const fields = this.parseCsvLine(lineText);
      if (fields.length < 5) continue;

      const abbr = fields[0];
      const ra1 = Number.parseFloat(fields[1]);
      const dec1 = Number.parseFloat(fields[2]);
      const ra2 = Number.parseFloat(fields[3]);
      const dec2 = Number.parseFloat(fields[4]);

      if (
        !abbr ||
        !Number.isFinite(ra1) ||
        !Number.isFinite(dec1) ||
        !Number.isFinite(ra2) ||
        !Number.isFinite(dec2)
      ) {
        continue;
      }

      if (!map.has(abbr)) {
        map.set(abbr, []);
      }
      map.get(abbr)!.push([[ra1, dec1], [ra2, dec2]]);
    }

    return map;
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
}
