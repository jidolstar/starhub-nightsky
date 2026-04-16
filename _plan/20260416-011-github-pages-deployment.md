# 20260416-011-GitHub Pages 배포 환경 구축

## 1. 개요
현재 로컬에서만 작동하는 프로젝트를 GitHub Pages를 통해 전 세계 누구나 접속할 수 있는 웹페이지로 배포하기 위한 환경을 구축한다. Vite 빌드 시스템의 기본 경로를 조정하고, 자동 배포 스크립트를 구성한다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - **베이스 경로 설정**: GitHub Pages 배포 주소는 `https://<유저명>.github.io/starhub-nightsky/` 형식이 되므로, 모든 내부 파일 참조에 `/starhub-nightsky/` 접두사가 자동으로 붙도록 설정합니다.
> - **데이터 경로 수정**: 기존 소스코드에 하드코딩된 `/assets/data/` 경로를 배포 환경에 맞춰 유동적으로 변경합니다.

## 3. 주요 변경 사항

### [MODIFY] [vite.config.ts](file:///d:/starhub-nightsky/vite.config.ts)
- `base: '/starhub-nightsky/'` 옵션을 추가하여 빌드 결과물이 서브디렉토리에서도 정상 동작하게 합니다.

### [MODIFY] [package.json](file:///d:/starhub-nightsky/package.json)
- 배포를 간편하게 해주는 `gh-pages` 패키지를 추가하고(안내 예정), `deploy` 스크립트를 정의합니다.

### [MODIFY] [SkyCanvas.vue](file:///d:/starhub-nightsky/src/app/components/SkyCanvas.vue)
- `assetPath` 설정을 `import.meta.env.BASE_URL`와 결합하여 환경에 무관하게 데이터를 정상 로드하도록 수정합니다.

## 4. 실행 방법 (작업 완료 후 사용자 수행)
1. **의존성 설치**: `npm install gh-pages --save-dev`
2. **배포 실행**: `npm run deploy`
3. **GitHub 설정**: 리포지토리 설정(Settings > Pages)에서 `gh-pages` 브랜치가 서비스 중인지 확인.

## 5. 검증 계획
- `npm run build`를 실행하여 `dist/index.html` 내의 리소스 경로가 `/starhub-nightsky/`로 시작하는지 확인.
- `SkyCanvas.vue`의 데이터 로드 경로가 런타임에 올바르게 계산되는지 코드 레벨 확인.
