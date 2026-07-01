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

`public/_redirects` 에 SPA 폴백(`/* /index.html 200`)이 포함돼 있습니다.
