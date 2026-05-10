# 타카마츠 여행 일본어 PWA

2026년 6월 13일 타카마츠(高松) 2박 3일 여행을 앞두고, 5월 10일부터 6월 12일까지 매일 1~2문장씩 일본어를 학습하는 모바일 우선 PWA입니다.

---

## 📱 지금 모바일에서 열기

### 👉 **[https://inesinesinesines.github.io/takamatsu-jp/](https://inesinesinesines.github.io/takamatsu-jp/)** 👈

휴대폰 카메라로 아래 QR 코드를 찍거나, 위 링크를 길게 눌러 공유 → 메시지로 보내서 모바일에서 열어 주세요.

[![QR 코드: 타카마츠 JP 열기](https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=https%3A%2F%2Finesinesinesines.github.io%2Ftakamatsu-jp%2F)](https://inesinesinesines.github.io/takamatsu-jp/)

### 홈 화면에 추가하기

| 플랫폼 | 절차 |
|---|---|
| 📱 **iPhone (Safari)** | 위 링크 열기 → 하단 공유 버튼(□↑) → **「홈 화면에 추가」** → 추가 → 홈 화면에 「旅」 아이콘 생성 |
| 🤖 **Android (Chrome)** | 위 링크 열기 → 우상단 ⋮ 메뉴 → **「앱 설치」** 또는 **「홈 화면에 추가」** |

> ⚠️ **iOS는 반드시 Safari**로 열어야 합니다 (Chrome iOS 앱에서는 PWA 설치 불가). Android는 Chrome 권장.
> ⚠️ 홈 화면 아이콘으로 다시 열어야 standalone(주소창 없음) + 알림 권한 요청이 가능합니다.

---

## 1. 로컬에서 열기

```bash
# 저장소 폴더에서
python -m http.server 8000
# 또는
python3 -m http.server 8000
```

브라우저로 `http://localhost:8000` 접속.

> ⚠️ `file://` 로 직접 열면 Service Worker와 fetch가 동작하지 않습니다. 반드시 정적 서버 경유.

---

## 2. GitHub Pages 배포 (최초 1회)

```bash
# 저장소 루트에서
git init
git add .
git commit -m "init: 타카마츠 여행 일본어 PWA"
git branch -M main
# GitHub.com에서 "takamatsu-jp" 저장소를 먼저 생성한 뒤:
git remote add origin https://github.com/inesinesinesines/takamatsu-jp.git
git push -u origin main
```

GitHub 저장소 페이지에서:
1. **Settings → Pages**
2. **Branch**: `main` / **Folder**: `/ (root)` → Save
3. 1~2분 뒤 배너에 `https://inesinesinesines.github.io/takamatsu-jp/` 표시 → 접속 확인

이후 변경 사항은 `git add . && git commit -m "..." && git push`만 하면 자동 재배포됩니다.

---

## 3. 알림 설정

### 권장 절차
1. 앱을 **홈 화면에 먼저 추가** (특히 iOS는 필수)
2. 홈 화면 아이콘으로 앱을 연다 (브라우저 X)
3. 설정 탭 → **「알림 권한 요청」** 허용
4. 알림 시간 설정 후 **저장**
5. **「알림 테스트」** 버튼으로 동작 확인

### 플랫폼별 제약

**Android**: 홈 화면 추가 후 권한 허용하면 비교적 잘 동작. 브라우저 백그라운드에서도 어느 정도 알림 가능.

**iOS**: 16.4 이상 + 홈 화면에 추가한 PWA에서만 알림 가능. Safari 브라우저로 직접 열면 권한 요청조차 불가능.

**공통**: 브라우저가 완전히 종료된 상태에서는 알림이 가지 않을 수 있어요. 하루 한 번 앱을 열어두시면 가장 잘 작동합니다.

---

## 4. 발음 듣기 (TTS)

Web Speech API를 사용하므로 **기기에 일본어 음성 데이터가 설치**되어 있어야 합니다. 음성이 없으면 🔇 아이콘이 뜨고, 누르면 플랫폼별 설치 가이드 모달이 나옵니다.

### 음성 설치 방법 요약
- **iOS / iPadOS**: 설정 → 손쉬운 사용 → 음성 콘텐츠 → 음성 → 일본어 다운로드
- **Android**: 설정 → 시스템 → 언어 및 입력 → TTS 출력 → 엔진의 음성 데이터에서 일본어 설치
- **macOS**: 시스템 설정 → 손쉬운 사용 → 말하기 → 시스템 음성 → 음성 관리 → Kyoko / Otoya 등
- **Windows**: 설정 → 시간 및 언어 → 언어 → 일본어 추가 (음성 패키지 포함) → 음성 항목에서 일본어 설치

설치 후에는 설정 화면의 **「다시 감지」** 버튼을 눌러 보이스를 갱신할 수 있어요.

---

## 5. 발음 표기 안내

- **장음**: 일본식 부호 `ー`. 예: `오네가이시마ー스`
- **인토네이션**: 문장 끝 `↗`(올림/질문), `↘`(내림/평서·요청)
- **촉음(작은 つ)**: ㅅ받침 또는 자음 반복. 예: `톳테`, `밋쯔`, `첵쿠인`
- **ん**: 다음 음에 따라 ㄴ/ㅁ/ㅇ. 예: `젬부`, `난지`, `캉코ー`
- **つ**: `쯔`로 표기

---

## 6. 파일 구조

```
.
├── index.html
├── style.css
├── app.js
├── notify.js
├── lessons.json          # 34일 학습 콘텐츠 (검수 완료, 임의 수정 금지)
├── manifest.json
├── sw.js
├── icon-192.png
├── icon-512.png
├── icon-maskable-512.png
├── icon-source.svg              # 디자인 원본
├── icon-source-maskable.svg     # maskable 안전 영역 버전
├── tools/
│   └── make_icons.py     # 아이콘 PNG 재생성 스크립트 (Pillow)
└── README.md
```

### 아이콘 재생성

```bash
python -m pip install --user Pillow
python tools/make_icons.py
```

---

## 7. 알려진 제약

- **iOS Safari (16.4 미만)**: PWA 푸시 알림 미지원. 인앱 배너만 동작.
- **iOS PWA**: `setTimeout` 기반 시간 예약 알림은 앱이 백그라운드일 때 사라질 수 있음. 앱 진입 시 인앱 배너가 보조 역할.
- **TTS**: 기기에 일본어 음성이 없으면 🔇로 표시. 직접 설치 필요.
- **오프라인**: 한 번 앱을 연 뒤부터 캐시되어 동작. 첫 방문은 네트워크 필요.

---

## 라이선스 / 저작권

학습 콘텐츠(`lessons.json`)는 본 프로젝트 한정 사용입니다. 코드는 자유롭게 수정·재배포해도 좋습니다.
