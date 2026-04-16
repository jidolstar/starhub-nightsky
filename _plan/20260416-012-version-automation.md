# 20260416-012-버전 및 변경 이력 자동화 계획

## 1. 개요
배포 프로세스(`github-deploy.bat`)에 버전 자동 업데이트와 변경 이력 관리 기능을 도입한다. 배포가 일어날 때마다 패치 버전(0.0.1 단위)을 자동으로 높여 프로젝트의 성장 과정을 기록한다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - **자동 커밋**: `npm version patch`는 실행 시 `package.json`의 변경 사항을 자동으로 Git에 커밋하고 태그를 생성한다. 배포 시마다 하나의 기록이 남게 된다.
> - **CHANGELOG 관리**: 배포 직전에 `CHANGELOG.md`에 작업 내용을 짧게 적어두면, 버전 히스토리가 더 풍성해진다.

## 3. 주요 변경 사항

### [NEW] [CHANGELOG.md](file:///d:/starhub-nightsky/CHANGELOG.md)
- 프로젝트의 첫 공식 기록을 담은 변경 이력 파일을 생성한다.
- `v0.1.0`: 지면 페이드 애니메이션, 광각 FOV(185도), GitHub Pages 배포 환경 구축 등을 포함한다.

### [MODIFY] [package.json](file:///d:/starhub-nightsky/package.json)
- 현재 버전 `0.0.0`을 시작점인 `0.1.0`으로 상향 조정한다.

### [MODIFY] [github-deploy.bat](file:///d:/starhub-nightsky/github-deploy.bat)
- 빌드 전 버전업을 수행하도록 수정한 다. (`npm version patch` 추가)

## 4. 검증 계획
- 배치 파일 실행 후 `package.json`의 `"version"` 필드가 정상 상향되었는지 확인한다.
- GitHub Pages 사이트에 새 버전의 빌드 결과물이 잘 올라가는지 체크한다.
