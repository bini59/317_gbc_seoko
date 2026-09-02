# 걸즈밴드 체크리스트

여러 동인행사의 참가 서클과 통판 정보를 살펴보고 방문 여부를 관리하는 체크리스트입니다.

- CSR SPA (Vite + React), 체크 상태는 브라우저 `localStorage`에 저장
- 각 서클의 X(트위터), 통판, 행사 관련 링크를 새 탭으로 열어 확인

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

## API 오류 응답
모든 오류는 일관된 형식으로 반환된다:
```json
{ "error": "사람이 읽는 메시지", "code": "invalid_request" }
```
| code | HTTP | 의미 |
| --- | --- | --- |
| `unauthorized` | 401 | Bearer 토큰 누락/불일치 (쓰기 요청) |
| `invalid_request` | 400 | 잘못된 입력·JSON·content-type (DB 변경 없이 거절) |
| `not_found` | 404 | 대상 event/circle/participation 없음 |
| `internal` | 500 | 처리되지 않은 서버 오류 |

- 모든 쓰기 요청은 런타임 스키마 검증(`worker/validate.ts`)을 통과해야 한다(slug/URL/enum/배열/숫자 ID).
- 서클 upsert는 다중 테이블을 D1 `batch()`(단일 트랜잭션)로 원자 처리 — 전부 성공 또는 전부 롤백.
- 쓰기 허용 origin은 `ALLOWED_ORIGINS`(쉼표 구분) 환경변수로 제한한다. 미설정 시 `*`.

## Cloudflare 배포
### 방법 A — Workers (권장)
```bash
npm run deploy
```

`wrangler.jsonc`의 `assets.directory`가 `dist/client`를 정적 자산으로 배포합니다.

### 방법 B — Cloudflare Pages
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist/client`

Wrangler로 직접 업로드할 때도 정적 클라이언트 산출물인 `dist/client`를 지정합니다.
```bash
npx wrangler pages deploy dist/client --project-name gbc-seoko
```

해시 라우팅을 사용하는 SPA라 별도 리라이트 설정은 필요 없습니다. (Cloudflare Workers 정적 자산 배포에서 `_redirects`의 `/* /index.html 200` 규칙은 무한 루프로 거부되므로 사용하지 않습니다.)

## PWA
배포된 사이트를 모바일 브라우저에서 홈 화면에 추가하면 독립 실행형 앱처럼 사용할 수 있습니다. 앱 데이터는 API에서 가져오므로 행사 목록을 처음 불러올 때는 네트워크 연결이 필요합니다.
