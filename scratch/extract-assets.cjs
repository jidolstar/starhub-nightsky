const fs = require('fs');
const path = require('path');

// 절대 경로 사용
const rootDir = process.cwd();
const filePath = path.join(rootDir, 'src', 'starhub-nightsky', 'data', 'ConstellationBoundaries.ts');
const content = fs.readFileSync(filePath, 'utf8');

// 정규식으로 CONSTELLATION_BOUNDARIES 배열 데이터만 추출
const jsonMatch = content.match(/export const CONSTELLATION_BOUNDARIES = (\[[\s\S]*?\]) as const/);
if (!jsonMatch) {
    console.error('Data not found');
    process.exit(1);
}

// as const 등 TS 문법 제거
const rawData = jsonMatch[1].replace(/ as const/g, '');

// 안전하게 파싱하기 위해 간단한 변환 (eval 대신 JSON.parse에 가깝게 처리하거나 구조 유지)
// 데이터가 단순 배열/객체 구조이므로 eval이 가장 빠름 (스크래치 환경)
const data = eval(rawData);

let csv = 'abbr,ra,dec,loop_index\n';
data.forEach(constellation => {
    constellation.loops.forEach((loop, loopIdx) => {
        loop.forEach(point => {
            csv += constellation.id + ',' + point[0] + ',' + point[1] + ',' + loopIdx + '\n';
        });
    });
});

const outputPath = path.join(rootDir, 'public', 'assets', 'data', 'constellation-boundaries.csv');
fs.writeFileSync(outputPath, csv);
console.log('CSV created at: ' + outputPath);

// 기존 CSV 파일들도 이동 (복사)
const catalogSrc = path.join(rootDir, 'src', 'starhub-nightsky', 'data', 'constellations.csv');
const catalogDest = path.join(rootDir, 'public', 'assets', 'data', 'constellation-catalog.csv');
if (fs.existsSync(catalogSrc)) {
    fs.copyFileSync(catalogSrc, catalogDest);
    console.log('Catalog copied');
}

const linesSrc = path.join(rootDir, 'src', 'starhub-nightsky', 'data', 'constellation-lines.csv');
const linesDest = path.join(rootDir, 'public', 'assets', 'data', 'constellation-lines.csv');
if (fs.existsSync(linesSrc)) {
    fs.copyFileSync(linesSrc, linesDest);
    console.log('Lines copied');
}
