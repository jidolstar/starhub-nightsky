# 20260416-016-브랜딩 및 메타데이터 강화 계획

## 1. 개요
프로젝트의 인지도를 높이고 공유 시 전문적인 시각적 경험을 제공하기 위해, 메인 스크린샷 에셋을 관리 최적화하고 고유의 로고/파비콘/앱 아이콘 세트를 제작하여 메타데이터에 연동한다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - **아이콘 디자인**: AI(DALL-E)를 사용하여 '현대적이고 미니멀한 밤하늘 로고'를 생성합니다. 생성된 시안을 확인 후 결정할 수 있습니다.
> - **이미지 경로**: `starhub-nightsky.png`를 `public/`으로 이동시키므로, 외부에서 직접 참조하는 링크가 있다면 주의가 필요합니다. (README는 경로를 수정할 예정입니다.)

## 3. Proposed Changes

### [Asset Management]
#### [MOVE] `starhub-nightsky.png` (root) -> (public)
- 배포된 URL(`https://jidolstar.github.io/starhub-nightsky/starhub-nightsky.png`)을 통해 OG 이미지로 활용 가능하도록 위치 변경.

#### [MODIFY] [README.md](file:///d:/starhub-nightsky/README.md)
- 이미지 경로를 배포 후의 정적 경로 또는 `public/` 경로로 업데이트하여 깨짐 방지.

### [Design & Branding]
#### [NEW] `public/logo.png`
- **디자인 컨셉**: Dark Navy background, Minimalist constellation or star cluster icon, Premimum flat design.
- **용도**: 파비콘, 앱 아이콘, 안드로이드/iOS 홈 화면 아이콘.

### [HTML Metadata]
#### [MODIFY] [index.html](file:///d:/starhub-nightsky/index.html)
- **Open Graph 태그 추가**: `og:title`, `og:description`, `og:image`(public의 스크린샷), `og:url`.
- **아이콘 연동**: `favicon.ico`, `apple-touch-icon.png` 등을 새 로고 이미지로 교체 및 설정.

## 4. Open Questions
> [!TIP]
> - 로고 아이콘에 별자리 형태(예: 북두칠성)가 포함되길 원하시나요? 아니면 더 추상적인 별 모양이 좋은가요?

## 5. Verification Plan
- **로컬 빌드**: `npm run build`를 통해 `public/`의 에셋들이 `dist/`에 정상적으로 포함되는지 확인.
- **메타데이터 검사**: 브라우저 개발자 도구의 `<head>` 섹션에서 메타 태그들이 정확한 값을 가리키는지 확인.
- **배포 후 확인**: GitHub Pages 배포 후 SNS 공유 테스트(미리보기 이미지 작동 여부) 권장.
