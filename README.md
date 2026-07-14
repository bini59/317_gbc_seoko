# 걸밴크 @ 7월 서코 2026 체크리스트

코믹월드 SUMMER 2026 (334회 · 7코 일산, 2026-07-18~19, 일산 킨텍스 제1전시장)에
참가하는 **걸즈밴드크라이(걸밴크)** 서클/통판 체크리스트입니다.

- CSR SPA (Vite + React), 체크 상태는 브라우저 `localStorage`에 저장
- 각 서클의 X(트위터) / 윗치폼 / 코믹월드 링크를 새 탭으로 열어 확인

## 로컬 실행
```bash
npm install
npm run dev
```

## 로컬 DB (D1)
빈 로컬 D1를 마이그레이션만으로 구성하고 개발용 seed를 넣는다:
```bash
npm run db:migrate:local   # migrations/ 적용 → 스키마 재현
npm run db:seed:local      # migrations/seed-dev.sql (최소 개발 데이터)
```

## 검증
```bash
npm run typecheck   # 클라이언트 + Worker 타입 체크
npm test            # vitest (Worker API 통합 + 클라이언트 단위)
npm run build
```
> 테스트는 Node 내장 `node:sqlite`(Node ≥ 22.5)로 마이그레이션을 인메모리 D1에 적용해 실행한다. PR마다 GitHub Actions(`.github/workflows/ci.yml`)가 install → typecheck → test → build를 수행한다.

## 빌드
```bash
npm run build   # → dist/ 생성
npm run preview # 빌드 결과 미리보기
```

## 이미 빌드된 결과 (dist/) — 즉시 배포 가능
`dist/` 폴더에 빌드 산출물이 포함돼 있어 바로 올릴 수 있습니다.
```bash
npx wrangler pages deploy dist --project-name gbc-seoko
```
> 로컬 참고: 이 저장소의 `dist/`는 bun 번들러로 미리 만들어 둔 것입니다.
> (`bun install --production && bun build src/main.jsx --outdir dist/assets --minify`)
> Cloudflare Pages의 Git 빌드는 아래 Vite 방식을 그대로 사용하면 됩니다.

## Cloudflare Pages 배포
### 방법 A — 대시보드(Git 연동)
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

### 방법 B — Wrangler로 dist 직접 업로드
```bash
npx wrangler pages deploy dist --project-name gbc-seoko
```

라우트가 `/` 하나뿐인 SPA라 별도 리라이트 설정은 필요 없습니다. (Cloudflare Workers 정적 자산 배포에서 `_redirects`의 `/* /index.html 200` 규칙은 무한 루프로 거부되므로 사용하지 않습니다.)
