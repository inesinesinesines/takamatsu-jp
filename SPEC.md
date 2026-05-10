# 타카마츠 여행 일본어 학습 PWA — 프로젝트 사양서 (v3)

이 문서를 Claude Code에 그대로 전달하면 작동하는 웹앱이 만들어집니다.
첨부 파일: `lessons.json` (34일치 학습 콘텐츠)

> **v3 변경점**
> - 아이콘 글자가 「旅」(여행)로 변경됨
> - iOS / Android 양쪽 PWA 지원이 명시적으로 강화됨 (메타 태그·아이콘·알림 제약·노치 대응)
> - 모든 응답(responses)에 furigana / romaji / tip이 추가됨
> - 각 일자에 followUp(내가 응답을 받고 한 번 더 받아치는 한마디) 추가됨

---

## 1. 프로젝트 개요

**목표**
2026년 6월 13일 타카마츠(高松) 2박 3일 여행을 앞두고, 5월 10일부터 6월 12일까지 매일 1~2문장씩 일본어를 학습하는 PWA를 GitHub Pages로 배포한다.

**핵심 요구사항**
- 단일 페이지 정적 웹앱 (HTML + CSS + JS, 빌드 도구 없음)
- 모바일 우선 디자인 (큰 글자, 탭하기 좋은 버튼, 노치/홈 인디케이터 안전 영역 대응)
- PWA: **iOS Safari + Android Chrome 양쪽에서 홈 화면 추가 가능**, 오프라인 동작
- 매일 정해진 시간에 알림 (사용자가 직접 시간 설정, 플랫폼별 제약 명시)
- 한국어 UI, 일본어 학습 콘텐츠
- 학습자 수준: 초급

**기술 스택**
- 바닐라 JS (프레임워크 없음)
- Service Worker (PWA·오프라인·알림)
- LocalStorage (학습 진도, 알림 시간 저장)
- 폰트: 시스템 폰트 + Noto Sans JP CDN

---

## 2. 발음 표기 규칙

콘텐츠 JSON에는 다음 규칙이 일관되게 적용되어 있습니다. 화면 렌더링 시 그대로 보여주면 됩니다.

- **장음**: 일본식 부호 `ー` 사용. 예: `오네가이시마ー스`
- **인토네이션**: 문장 끝 화살표. `↗` 올림(질문), `↘` 내림(평서·요청)
- **촉음(작은 つ)**: ㅅ받침 또는 자음 반복. 예: `톳테`, `밋쯔`, `첵쿠인`
- **ん**: 다음 음에 따라 ㄴ/ㅁ/ㅇ. 예: `젬부`, `난지`, `캉코ー`
- **つ**: `쯔`로 표기

`lessons.json`의 `meta.pronunciationGuide`에도 기록되어 있으며, 설정 화면에서 사용자에게 보여줍니다.

---

## 3. 화면 구성

### 화면 A — 오늘의 학습 (홈)

상단부터 순서대로:

1. **헤더**: 「타카마츠 여행 일본어 D-N」, 오늘 날짜
2. **진행도 바**: `Day X / 34`
3. **상황 카드**: 단계 태그(우동·미술관 등) + 장면 설명
4. **핵심 문장 카드** (1~2개)
   - 일본어 (가장 큰 글자, Noto Sans JP)
   - 후리가나 (작게)
   - **한국어 발음 (kana_ko)** — 강조색, 화살표는 별도 색
   - 로마자 (회색, 한 줄)
   - 한국어 뜻
   - 🔊 발음 듣기 (Web Speech API, ja-JP)
   - 💡 팁 (접기/펼치기)
5. **예상 응답 카드** — 「상대가 이렇게 말할 수 있어요」
   - **응답에도 핵심 문장과 동일한 6개 필드 모두 표시** (ja, furigana, romaji, kana_ko, ko, tip)
   - 단, 시각적으로는 핵심 문장보다 약간 작은 크기로 (위계 차이)
6. **내가 다시 한마디 (followUp)** — 「이렇게 받아쳐 보세요」
   - 응답을 들은 뒤 자연스럽게 이어서 할 수 있는 한마디
   - 카드 디자인은 상황에 맞춰 살짝 다른 색조로 구분 (대화 흐름 인지)
7. **학습 완료** 토글 버튼 — 진도 저장

**렌더링 위계 (위에서 아래로 흐름)**
```
[내가 먼저]    핵심 문장 카드 (가장 크게)
     ↓
[상대가 응답]  응답 카드 1, 2 (중간 크기)
     ↓
[내가 다시]    followUp 카드 (작은 크기, 미묘하게 다른 배경)
```

이 시각적 흐름이 **'대화'를 학습한다**는 핵심 가치를 전달합니다.

**한국어 발음 표시 (CSS)**
```css
.kana-ko {
  color: var(--accent);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin: 6px 0;
}
.kana-ko .arrow {
  color: var(--secondary);
  font-size: 14px;
  margin-left: 4px;
  font-weight: 400;
}
```

JS에서 `kana_ko` 문자열의 화살표(`↗`/`↘`)를 별도 `<span class="arrow">`로 감싸 시각적으로 분리.

**카드 위계 색상 차이**
- 핵심 문장 카드: 흰 배경, 진한 경계선
- 응답 카드: 살짝 톤다운된 배경 (`#fbf7f0`)
- followUp 카드: 더 옅은 배경 (`#f5f0e6`), 카드 위에 작은 라벨 「내가 다시」

### 화면 B — 전체 일정
- 34일 그리드 (7×5 정도)
- 각 셀: Day 번호, 날짜, 단계 태그
- 완료된 날 = 색 채움, 오늘 = 강조, 미래 = 흐리게 + 「잠금」
- 셀 탭 → 해당 날 학습 화면

### 화면 C — 설정
- 알림 시간 설정 (시:분, 기본 09:00)
- 알림 권한 요청 / 현재 권한 상태
- 「알림 테스트」 버튼
- **플랫폼별 알림 안내 섹션** — iOS와 Android 각각의 제약 명시 (5절 참조)
- 「발음 표기 안내」 — `meta.pronunciationGuide` 4줄
- 진도 초기화 (확인 다이얼로그)
- 앱 정보·버전

### 네비게이션
하단 탭 3개: `오늘 / 일정 / 설정`. 하단 탭은 iOS 홈 인디케이터를 피하도록 `padding-bottom: env(safe-area-inset-bottom)` 적용.

---

## 4. 데이터 구조

`lessons.json`의 각 요소(sentences, responses, followUp)는 모두 동일한 6개 필드 구조를 갖습니다.

```json
{
  "ja": "일본어 원문 (한자 포함)",
  "furigana": "한자를 히라가나로 풀어쓴 버전",
  "romaji": "헵번식 로마자",
  "kana_ko": "한글 발음 + 인토네이션 화살표",
  "ko": "한국어 뜻",
  "tip": "팁 (응답·followUp의 tip은 행동 지침: 이 답이 오면 ~하면 됩니다)"
}
```

레슨 단위 구조:

```json
{
  "day": 1,
  "date": "2026-05-10",
  "phase": "출국 준비",
  "scene": "공항 체크인 카운터",
  "sentences": [ /* 내가 먼저 하는 말 */ ],
  "responses":  [ /* 상대가 응답 */ ],
  "followUp":   [ /* 내가 받아치는 한마디 */ ]
}
```

**필드 차이**
| 필드 종류 | 역할 | tip 내용 |
|---|---|---|
| sentences | 내가 먼저 하는 말 | 문법·문화 설명 |
| responses | 상대가 할 말 | "이 답이 오면 어떻게 행동" |
| followUp | 내가 다시 받아치는 말 | 표현·뉘앙스 설명 |

응답·followUp의 tip은 단순 단어 풀이가 아니라 **여행 현장에서 어떻게 행동/대답할지**를 알려주는 식이어야 합니다 (이미 lessons.json에 그렇게 작성되어 있음).

**오늘 날짜 결정 로직**
```js
function getTodayLesson(lessons) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return lessons.find(l => {
    const d = new Date(l.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
}
```

5/10 이전이거나 6/12 이후면 가장 가까운 날 + 안내 문구.

**진도 저장**
`localStorage`에 `progress` 키로 저장:
```json
{ "completed": [1, 2, 5], "lastVisited": "2026-05-15" }
```

---

## 5. PWA 설정 — iOS / Android 양쪽 지원

**핵심 원칙**: PWA 표준은 양 플랫폼에서 동작하지만, iOS Safari는 별도 메타 태그와 아이콘이 필요하며 알림 제약도 큽니다. 두 플랫폼 모두 깔끔히 동작하도록 명시적으로 처리합니다.

### `manifest.json`
```json
{
  "name": "타카마츠 여행 일본어",
  "short_name": "타카마츠 JP",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#fdfaf6",
  "theme_color": "#d4633c",
  "orientation": "portrait",
  "lang": "ko",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`maskable` 아이콘은 Android에서 적응형 아이콘(원·둥근 사각형 등 다양한 마스크) 처리를 위해 안전 영역(중앙 80%)에 글자가 들어가도록 만듭니다.

### `index.html` `<head>` — iOS / Android 공통
```html
<!-- 기본 -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#d4633c">
<title>타카마츠 여행 일본어</title>

<!-- PWA -->
<link rel="manifest" href="manifest.json">

<!-- iOS Safari 전용 -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="타카마츠 JP">
<link rel="apple-touch-icon" href="icon-192.png">

<!-- 폰트 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap">
```

`viewport-fit=cover`는 iPhone 노치 영역까지 화면을 확장합니다. 함께 CSS에서 안전 영역 처리:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.bottom-tab-nav {
  /* 하단 탭 바도 홈 인디케이터 피하기 */
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}
```

### `sw.js` (Service Worker)
- 정적 자원 캐싱 (HTML, CSS, JS, JSON, 폰트, 아이콘)
- `fetch` 이벤트: 캐시 우선, 실패 시 네트워크
- 캐시 버전 관리 (예: `CACHE_NAME = 'takamatsu-jp-v1'`)

### 알림 — 플랫폼별 제약과 전략

**Android Chrome** (가장 좋은 환경)
- `Notification` API + Service Worker 푸시 잘 동작
- 홈 화면 추가 후에도, 추가 안 해도 비교적 잘 동작
- `setTimeout`은 앱이 닫혀 있으면 사라지지만, Notification 권한이 있으면 PWA가 백그라운드로 살아있을 때 알림 가능

**iOS Safari** (제약이 큼)
- **반드시 iOS 16.4 이상** + **반드시 홈 화면에 추가한 PWA**에서만 푸시 알림 동작
- Safari 브라우저에서 직접 열면 알림 권한조차 요청 불가
- `Notification.permission` 체크 시 iOS가 PWA 모드인지 먼저 확인 필요
- 정확한 시간 예약 알림은 사실상 불가능 — 앱이 열렸을 때만 안정적

**현실적인 절충안**
1. 사용자가 앱을 열 때마다, 「오늘 알림을 이미 봤는지」를 `localStorage`로 확인
2. 안 봤고 + 설정 시간이 지났다면, **앱 진입 시 즉시 인앱 배너로 「오늘의 학습이 도착했어요」**
3. 앱이 열린 동안 `setTimeout`으로 설정 시간에 정확히 `Notification` 발생
4. 설정 화면에 정직하게 안내 (아래 문구 참조)

**설정 화면 안내 문구 (그대로 사용)**

```
📱 알림 안내

▸ Android 이용자
앱을 홈 화면에 추가한 뒤, 알림 권한을 허용하세요.
브라우저가 백그라운드에 있어도 어느 정도 알림이 작동합니다.

▸ iOS 이용자
1. iOS 16.4 이상이어야 알림을 받을 수 있어요.
2. Safari에서 ‘공유 → 홈 화면에 추가’로 PWA를 설치한 뒤,
   홈 화면 아이콘으로 앱을 열어주세요.
3. 그 상태에서 알림 권한을 허용해야 작동합니다.
4. 브라우저로 직접 열면 알림이 동작하지 않습니다.

▸ 공통
브라우저가 완전히 닫힌 상태에서는 알림이 가지 않을 수 있습니다.
하루 한 번 앱을 열어두시면 가장 잘 작동합니다.
```

**iOS PWA 모드 감지 (참고용 코드)**
```js
const isIOSPWA = window.navigator.standalone === true;
const isAndroidPWA = window.matchMedia('(display-mode: standalone)').matches;
const isPWA = isIOSPWA || isAndroidPWA;
```

iOS가 비-PWA 모드일 때는 알림 권한 요청 버튼을 비활성화하고 「먼저 홈 화면에 추가해 주세요」 안내 표시.

---

## 6. 디자인 가이드

**컨셉**: 일본 시코쿠 우동 가게의 따뜻하고 정갈한 느낌. 종이·먹·국물의 색감.

**색상 팔레트**
| 용도 | 값 |
|---|---|
| 배경 | `#fdfaf6` |
| 표면(핵심 카드) | `#ffffff` |
| 표면(응답 카드) | `#fbf7f0` |
| 표면(followUp 카드) | `#f5f0e6` |
| 강조(accent) | `#d4633c` ← kana_ko 텍스트 |
| 보조(secondary) | `#3d5a4a` ← 인토네이션 화살표·완료 표시 |
| 텍스트 본문 | `#2a2a2a` |
| 텍스트 보조 | `#6b6b6b` |
| 경계선 | `#e8e2d8` |

**타이포그래피**
- 일본어: `'Noto Sans JP', sans-serif`
- 한국어: 시스템 기본 (`-apple-system, 'Apple SD Gothic Neo', 'Pretendard', sans-serif`)
- 핵심 문장 일본어: 28~32px / 500
- 응답 일본어: 22~24px / 500 (위계 차이)
- followUp 일본어: 20px / 500
- 후리가나: 12px / 보조색
- kana_ko: 17px / accent / 500
- 로마자: 13px / 보조색
- 한국어 본문: 16px

**컴포넌트**
- 카드: 라운드 16px, 옅은 그림자, 1px 경계선
- 버튼: 라운드 12px, 패딩 14×20px
- 단계 태그: 알약 모양 작은 라벨, 단계별 색 변형 (우동=주황, 미술관=녹색, 쇼핑=베이지, 비상=빨강 톤다운, 그 외=회색)
- followUp 카드 위에는 작은 라벨 「내가 다시」 (보조색, 12px, 굵게)

**레이아웃**
- 모바일 너비 최대 480px, 가운데 정렬
- 좌우 패딩 20px (+ safe-area 좌우 inset)
- 카드 간 간격 16px

---

## 7. 아이콘 생성

「**旅**」(여행) 한 글자가 들어간 미니멀한 디자인.

**SVG 디자인 (icon-source.svg)**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#d4633c"/>
  <text x="50%" y="50%" 
        font-family="'Noto Serif JP','Noto Sans JP',serif"
        font-size="320" 
        font-weight="700"
        fill="#fdfaf6"
        text-anchor="middle"
        dominant-baseline="central">旅</text>
</svg>
```

**필요한 PNG 출력**
| 파일명 | 크기 | 용도 |
|---|---|---|
| `icon-192.png` | 192×192 | manifest 표준, iOS apple-touch-icon |
| `icon-512.png` | 512×512 | manifest 표준 (Android 스플래시 등) |
| `icon-maskable-512.png` | 512×512 | manifest maskable (Android 적응형) |

**maskable 버전 주의점**
Android는 아이콘을 다양한 마스크(원, 둥근 사각형, 물방울 등)로 자를 수 있습니다. maskable 아이콘은 글자가 잘리지 않도록 **중앙 80% 안에** 위치해야 합니다. 위 SVG에서 글자 크기를 작게 조정 (예: `font-size="240"`) 하거나 안전 영역에 맞게 패딩을 더 주어 별도 파일로 만듭니다.

**생성 방법 (예시)**
```bash
# ImageMagick 사용
convert -background none icon-source.svg -resize 192x192 icon-192.png
convert -background none icon-source.svg -resize 512x512 icon-512.png
# maskable은 별도 SVG 파일에서 글자 크기 작게
convert -background none icon-source-maskable.svg -resize 512x512 icon-maskable-512.png
```

또는 Claude Code가 환경에 따라 Python (`Pillow` + `cairosvg`) 등으로 변환해도 됩니다.

---

## 8. 파일 구조

```
takamatsu-jp/
├── index.html             # 단일 페이지 (3개 화면 토글)
├── style.css
├── app.js                 # 라우팅, 렌더링, 진도 관리
├── notify.js              # 알림 로직 (플랫폼 감지 포함)
├── lessons.json           # 학습 데이터 (이미 제공됨)
├── manifest.json
├── sw.js                  # Service Worker
├── icon-192.png
├── icon-512.png
├── icon-maskable-512.png
└── README.md
```

---

## 9. README.md 내용

1. 프로젝트 소개
2. 로컬에서 열기: `python3 -m http.server 8000` → `http://localhost:8000`
3. **GitHub Pages 배포**
   - 저장소 생성, 푸시
   - Settings → Pages → Branch: `main`, Folder: `/ (root)` → Save
   - `https://<username>.github.io/takamatsu-jp/`
4. **모바일 홈 화면 추가**
   - **Android Chrome**: 메뉴 → 「홈 화면에 추가」 (또는 자동 배너)
   - **iOS Safari**: 공유 → 「홈 화면에 추가」 (iOS 16.4 이상)
5. **알림 설정**
   - 홈 화면에서 앱을 연다 (브라우저 X)
   - 설정 탭 → 「알림 권한 허용」
   - 시간 설정 후 저장
6. 발음 표기 안내 (`pronunciationGuide` 그대로)
7. 알려진 제약 (5절 알림 안내 문구 그대로 옮김)

---

## 10. Claude Code 작업 순서

**Step 1**: 프로젝트 폴더 생성, `lessons.json` 복사.

**Step 2**: `index.html` 작성. 5절의 head 메타 태그 모두 포함. 3개 영역(`#view-today`, `#view-schedule`, `#view-settings`) 구조.

**Step 3**: `style.css`. CSS 변수로 색·폰트 관리. `safe-area-inset` 적용. `.kana-ko`, `.kana-ko .arrow`, 카드 3단계 위계, followUp 라벨 스타일 정의.

**Step 4**: `app.js`
- `lessons.json` fetch
- 오늘 날짜 매칭 → 핵심 문장 / 응답 / followUp 순서로 렌더
- **응답·followUp도 핵심 문장과 동일한 6개 필드 모두 표시** (단, 시각 위계만 다르게)
- `kana_ko` 화살표 분리 헬퍼:
  ```js
  function renderKanaKo(text) {
    return text.replace(/([↗↘])/g, '<span class="arrow">$1</span>');
  }
  ```
- 일정 그리드, 진도 토글, Web Speech API(`ja-JP`) 발음, 하단 탭 라우팅
- iOS PWA 모드 감지 → 알림 권한 UI 분기

**Step 5**: `notify.js`
- 플랫폼 감지 (iOS/Android, PWA 여부)
- 권한 요청 (iOS는 PWA 모드일 때만)
- 시간 설정 저장
- 앱 진입 시 「오늘 봤는지」 확인 → 인앱 배너
- `setTimeout` 기반 당일 예약 알림

**Step 6**: `manifest.json`, `sw.js`, 아이콘 3종 (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`).

**Step 7**: `README.md` (9절 내용).

**Step 8**: 로컬 정적 서버에서 콘솔 에러 없이 동작 확인. 11절 체크리스트 참조.

---

## 11. 사용자 검수 체크리스트

**콘텐츠 표시**
- [ ] 5/10 오늘 열었을 때 Day 1, 「공항 체크인 카운터」 표시
- [ ] 핵심 문장 「첵쿠인오 오네가이시마ー스 ↘」가 강조색, 화살표는 보조색·작게
- [ ] 응답 카드에도 furigana, romaji, kana_ko, tip 모두 표시됨
- [ ] followUp 카드 위에 「내가 다시」 라벨 표시, 다른 배경색
- [ ] 발음 듣기 버튼 → ja-JP TTS 들림
- [ ] 일정 화면에서 6/12 = Day 34 = 「귀국」으로 표시
- [ ] 학습 완료 토글 후 새로고침 → 상태 유지

**iOS Safari**
- [ ] iOS 16.4+ 기기에서 Safari로 페이지 열기
- [ ] 공유 → 홈 화면에 추가 → 旅 아이콘으로 설치됨
- [ ] 홈 화면에서 앱 실행 시 standalone 모드(주소창 없음)
- [ ] 노치/홈 인디케이터 영역과 컨텐츠가 겹치지 않음
- [ ] 설정에서 알림 권한 요청 가능 (PWA 모드에서만)

**Android Chrome**
- [ ] Chrome으로 페이지 열기
- [ ] 메뉴 → 홈 화면에 추가 → 旅 아이콘 (maskable 형태로 적응형 표시)
- [ ] 홈 화면 실행 시 standalone 모드
- [ ] 알림 권한 허용 후 시간 설정 → 동작
- [ ] 브라우저 일반 모드에서도 페이지 정상 동작

**공통**
- [ ] 설정 화면에 발음 표기 안내 4줄 표시
- [ ] 설정 화면에 iOS / Android 알림 안내 문구 표시
- [ ] 오프라인 상태에서도 (한 번 열어본 뒤) 앱이 열림

---

## 12. 우선순위

- 콘텐츠 표시 + 진도 저장이 핵심. 알림은 보조.
- 시간이 부족하면 알림은 인앱 배너만으로 충분.
- 아이콘 maskable은 디테일 — 기본 192/512만 만들고 마지막에 추가해도 OK.
- `lessons.json`은 검수 완료된 콘텐츠. 임의 수정 금지. `kana_ko` 문자열도 가공하지 말 것 (화살표만 별도 스타일링).

이상.
