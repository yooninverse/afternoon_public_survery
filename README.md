# AfterNOON · VFQ-NEAR 자가 설문

근거리 시생활 자가점검 설문(6문항) — 모바일 웹.
**Stack**: Next.js 14 (App Router) · React 18 · GA4

---

## 1. 로컬 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정 (선택 — GA4 사용 시에만 필요)
cp .env.local.example .env.local
# .env.local 을 열어 NEXT_PUBLIC_GA_ID 값을 본인 GA4 측정 ID로 교체

# 3) 개발 서버
npm run dev
# → http://localhost:3000
```

`NEXT_PUBLIC_GA_ID` 가 없으면 GA4 스크립트는 로드되지 않고, 콘솔 로그(`[VFQ track] ...`)만 찍힙니다.

---

## 2. GA4 설정

### 2-1. 측정 ID 발급
1. https://analytics.google.com 접속 → 관리 → **속성 만들기** (이미 있으면 생략)
2. **데이터 스트림** → **웹** 선택 → 사이트 URL 등록 (Vercel 배포 후 도메인)
3. 스트림 화면 상단의 **측정 ID** (`G-XXXXXXXXXX`) 복사

### 2-2. 환경변수 등록
- 로컬: `.env.local` 에 `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
- Vercel: 프로젝트 Settings → Environment Variables 에 동일 키/값 등록 (Production / Preview / Development 모두 체크 권장)

### 2-3. 이벤트 확인 (DebugView)
배포 직후 표준 보고서에는 24~48시간 지연이 있습니다. 즉시 검증하려면:

1. 크롬에 **GA Debugger** 확장프로그램 설치
2. 배포된 페이지에서 확장프로그램 활성화 후 설문 진행
3. GA4 → 관리 → **DebugView** 에서 이벤트 실시간 확인

---

## 3. 추적되는 이벤트 (전체)

`lib/analytics.js` 의 `track()` 이 호출하는 모든 이벤트입니다.

| 이벤트명 | 시점 | 파라미터 |
|---|---|---|
| `vfq_landing_view` | 랜딩 페이지 노출 | — |
| `vfq_start_click` | "시작하기" 버튼 클릭 | — |
| `vfq_question_view` | 각 문항 노출 | `question_index` (1~6) |
| `vfq_question_answered` | 응답 선택 | `question_index`, `answer` (1~6) |
| `vfq_completed` | 결과 페이지 도달 | `score`, `na_count`, `valid_count` |
| `vfq_save_click` | 결과 저장 클릭 | `score` |
| `vfq_save_signup_redirect` | 가입 화면으로 이동 | — |
| `vfq_save_dismiss` | 저장 안내 닫기 | — |
| `vfq_share_open` | 공유 트리거 | — |
| `vfq_share_click` | 실제 공유 발생 | `method` (`web_share_api` / `copy_link` / `kakao_*`) |
| `vfq_restart_click` | 다시 하기 | — |

### 핵심 KPI (보고서 기준)

| 지표 | 정의 |
|---|---|
| 시작 전환율 | `vfq_start_click` / `vfq_landing_view` |
| 완료율 (제출율) | `vfq_completed` / `vfq_start_click` |
| 가입 전환율 | `vfq_save_signup_redirect` / `vfq_completed` |
| 공유 실행률 | `vfq_share_click` / `vfq_completed` |

### Key Event(전환) 등록 권장
GA4 → 관리 → **이벤트** → 다음 3개를 **"주요 이벤트(Key Event)"** 로 표시:
- `vfq_completed`
- `vfq_save_signup_redirect`
- `vfq_share_click`

### Custom dimensions 등록
`score`, `question_index`, `answer`, `method` 등을 **보고서에서 dimension으로 쪼개 보려면** 반드시 등록 필요:
- GA4 → 관리 → **맞춤 정의** → **맞춤 측정기준 만들기**
- 이벤트 매개변수명: `score` (number), `question_index` (number), `answer` (number), `method` (string)

> 등록 전에 발생한 이벤트는 dimension으로 활용 불가합니다. **배포 직후 바로 등록**하세요.

---

## 4. Vercel 배포

### Option A. GitHub 연동 (권장)
1. 이 폴더를 GitHub repo로 push
2. https://vercel.com/new → repo 선택 → **Framework: Next.js** 자동 감지 → Deploy
3. Settings → Environment Variables 에 `NEXT_PUBLIC_GA_ID` 등록
4. Deployments 탭에서 **Redeploy** (환경변수가 빌드에 포함되도록)
5. 배포 완료 → `https://<your-project>.vercel.app` 에서 확인

### Option B. Vercel CLI
```bash
npm i -g vercel
vercel        # 첫 배포 (질문에 답하면 됨)
vercel --prod # 프로덕션 배포
# 환경변수는 vercel env add NEXT_PUBLIC_GA_ID 로 추가 후 재배포
```

### 커스텀 도메인 (예: vfq.afternoon.clop.ai)
Vercel 프로젝트 → Settings → Domains → Add → DNS 안내대로 CNAME 설정.

---

## 5. 운영 시 교체해야 할 placeholder

| 위치 | 현재 값 | 교체 |
|---|---|---|
| `components/VFQNearSurvey.jsx` 의 `target` | `https://afternoon.clop.ai/signup?from=vfq_near` | 실제 간편가입 URL |
| 카카오톡 공유 버튼 | placeholder (토스트만 표시) | Kakao JavaScript SDK 연동 (`Kakao.Share.sendDefault`) |

---

## 6. 폴더 구조

```
.
├── app/
│   ├── layout.jsx       # GA4 스크립트 + Pretendard + 메타데이터
│   ├── page.jsx         # 홈 (= 설문)
│   └── globals.css      # 리셋 / 기본 폰트
├── components/
│   └── VFQNearSurvey.jsx
├── lib/
│   └── analytics.js     # track() — GA4 wrapper
├── .env.local.example
├── .gitignore
├── jsconfig.json
├── next.config.mjs
└── package.json
```

---

## 7. 알아두면 좋은 것

- **쿠키 동의**: GA4 기본 설정은 쿠키를 사용합니다. 한국 PIPA 기준상 본 설문에서 직접적인 식별정보를 받지 않으므로 즉시 차단 사유는 약하지만, 향후 가입(개인정보 수집)과 분석 동의 배너를 함께 두는 걸 권합니다.
- **개인정보 수집 시점**: 본 페이지 자체는 **무수집** 입니다. 가입 페이지로 redirect한 뒤부터 개인정보 동의·수집이 일어나야 합니다.
- **결과 해석**: 점수 구간별 이모지/문구는 descriptive이며 임상 진단이 아닙니다. 해석 문구 변경은 `components/VFQNearSurvey.jsx` 의 `interpret()` 함수에서.
