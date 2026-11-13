# 국도 ITS 장애감시장치 · 요일별 점검 동선

카카오맵 위에 요일별 점검 동선을 보여 주고, 지점마다 **완료 / 이상있음(사유) / 취소**를 기록하는 웹앱(휴대폰 홈 화면 앱 가능)입니다.
기록은 Netlify 서버에 저장되어 **팀원 모두가 같은 기록**을 봅니다(화면이 켜져 있으면 20초마다 자동 갱신).

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `public/index.html` | 앱 화면 전체(지도·목록·정보창·동기화). 지점 데이터 `DAYS`도 이 안에 있음 |
| `public/sw.js`, `manifest.webmanifest`, `icon-*.png` | 홈 화면 앱(PWA)용 |
| `netlify/functions/records.mjs` | 공유 기록 API `/api/records` (Netlify Functions + Netlify Blobs) |
| `netlify.toml`, `package.json` | Netlify 배포 설정 |

## 배포 방법 (처음 한 번)

> ⚠️ Netlify 화면에 폴더를 끌어다 놓는 방식(Drag & Drop)으로는 **공유 기록 서버가 올라가지 않습니다.**
> 아래처럼 GitHub에 올린 뒤 Netlify에 연결하세요. (이 PC에 별도 설치 필요 없음, Git만 있으면 됨)

### 1) GitHub에 올리기

1. GitHub에서 **New repository** → 이름 예: `its-inspection-route`, **Private** 선택, README 추가하지 않음 → Create.
2. 이 폴더에서 아래 명령 실행 (Git Bash 또는 PowerShell). `<계정>`은 본인 GitHub 아이디로 바꿉니다.

```bash
cd "C:/Users/Desktop/Documents/KMH/proj/inspection_route"
git init -b main
git add .
git commit -m "점검 동선 앱 + 팀 공유 기록"
git remote add origin https://github.com/<계정>/its-inspection-route.git
git push -u origin main
```

### 2) Netlify에 연결

1. https://app.netlify.com → **Add new project → Import an existing project → GitHub** → 위 저장소 선택.
2. 빌드 설정은 `netlify.toml`이 자동으로 채웁니다(Publish directory `public`, Functions `netlify/functions`). 그대로 둡니다.
3. **Deploy** → 1~2분 뒤 `https://○○○.netlify.app` 주소가 생깁니다.
   - 주소를 바꾸려면: Project configuration → General → **Change project name** (카카오 등록 전에 바꾸세요).
   - 새 프로젝트가 비공개로 만들어지면: Project configuration → General → Visitor access → **Public**.

### 3) 카카오 도메인 등록 (지도 표시용)

카카오 개발자 사이트 → 내 애플리케이션 → 해당 앱 → **플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인**에
`https://○○○.netlify.app` 을 추가하고 몇 분 기다린 뒤 새로고침합니다.

### 4) 팀원 안내

1. 휴대폰에서 주소 열기 → 처음 한 번 **점검자 이름** 입력(기록에 이름·시간이 남음). 팀 코드는 없습니다 — 주소를 아는 사람은 누구나 기록할 수 있으니 주소는 팀원에게만 공유하세요.
2. 공유 메뉴 → **홈 화면에 추가** 하면 앱처럼 쓸 수 있습니다.
3. 오른쪽 위 표시: `● 공유 중`(정상) · `대기 n`(인터넷이 끊겨 n건이 휴대폰에 보관 중, 연결되면 자동 업로드) · `이 기기만`(서버 없이 열린 경우).

## 운영

- **일차 구성**: 1일차 판암①, 2일차 판암②, 3일차 내수노드, 4일차 부여노드, 5일차 단양노드.
- **기록 방법**: 지점을 누르면 정보창이 열립니다.
  - `✓ 완료` 한 번 → 로그 `이름 - 완료` (지도 핀이 초록색 "완료"로 바뀜)
  - `⚠ 이상있음` → **이상 사유 필수** → 로그 `이름 - 이상 사유` (지도 핀 빨간색 "이상")
  - 완료/이상 뒤에는 `완료 취소`·`이상 취소`(취소 사유 선택), 이상일 때는 `사유 수정`·`조치 완료` 버튼이 나옵니다.
- **작업 로그**: ⋯ 메뉴 → "작업 로그 (점검자별)". 모든 기록을 최신순으로, 점검자별로 골라 볼 수 있고 줄을 누르면 그 지점으로 이동합니다.
- **진행률**: 완료 ÷ 전체 지점. 주소 목록 위(전체 또는 선택한 일차), 일차별 제목, 상단 탭에 % 와 얇은 막대(초록 = 완료, 빨강 = 이상)로 표시됩니다.
- **기록 초기화 기능은 없습니다.** 잘못 누른 기록은 `완료 취소`·`이상 취소`로 되돌리고, 취소도 이력에 남습니다.
- **CSV 내보내기**: ⋯ 메뉴. 팀 전체 기록 + 수정 이력(누가·언제)이 들어 있습니다. 엑셀에서 바로 열립니다.
- **동시에 같은 지점을 고친 경우**: 더 나중에 누른 기록이 최종 상태가 되고, 모든 변경은 이력에 남습니다. 오프라인으로 늦게 올라온 예전 기록은 최신 상태를 덮지 않고 이력에만 들어갑니다.

- **길안내 · 로드뷰** (지점 정보창 아래, 주소 목록의 각 지점 아래)
  - `카카오내비 길안내`, `n번→n+1번 길찾기`, `현위치→여기`: 휴대폰에서는 **카카오내비 앱**이 바로 열립니다(앱이 없으면 설치 화면). 카카오내비는 항상 **지금 위치에서 출발**합니다. PC에서는 카카오맵 웹 길찾기가 열립니다.
  - `로드뷰 보기`: 앱 안에서 바로 로드뷰를 보여 줍니다(가장 가까운 로드뷰 위치에서 지점 방향, 지점에 마커). 300m 안에 로드뷰가 없으면 안내만 나옵니다.
  - 카카오내비는 지도와 같은 JavaScript 키·등록 도메인을 씁니다(추가 설정 없음).
- **지번 주소 위치로 표시**: `index.html`의 `DAYS` 지점 배열에서 9번째 값을 `1`로 두면 좌표 대신 지번 주소로 찾은 위치에 핀을 찍습니다(현재 부여노드 1번). 찾은 위치는 기기에 저장되고, 상위국(⌂)이 같은 지점이면 함께 옮겨집니다.
- **거리 안내**: `1번→마지막`, `상위국 출발·복귀`, `복귀 약 n km`는 앱을 열 때 지점 위치로 다시 계산합니다(OSRM). 계산이 안 되면 `DAYS`에 저장된 값을 보여 줍니다.
- **내 위치(GPS)**: 먼저 대략 위치를 바로 보여 주고 GPS 정밀 위치로 갱신합니다. 다시 누르면 정확도(±m)를 알려 줍니다. 오차가 계속 크면 휴대폰 설정에서 브라우저(또는 홈 화면 앱)의 위치 권한을 **정확한 위치**로 허용하고 GPS를 켜 주세요.
- **Powered by Netlify 배지 끄기**: Netlify → 프로젝트 → Project configuration → General → **Powered by Netlify badge** → 끄기 → Save. 재배포 필요 없음.

## 버전 업데이트 · 다시 배포

1. **버전 올리기** (휴대폰에 새 버전이 들어갔는지 확인하는 용도)
   - `public/index.html` 위쪽 `var APP_VERSION = "..."` 값을 바꿉니다. 예: `"2026-11-20 (v3)"`
   - `public/sw.js` 위쪽 `const CACHE = "route-v2"`의 숫자를 하나 올립니다. 예: `"route-v3"`
   - 적용 확인: 휴대폰 앱의 ⋯ 메뉴 맨 아래 `버전 …` 표시.
2. **GitHub에 올리기** — 둘 중 편한 방법. 올리면 Netlify가 1~2분 안에 자동으로 다시 배포합니다.
   - **A. Git이 있는 PC**: 바뀐 파일을 이 폴더에 덮어쓴 뒤
     ```bash
     git add .
     git commit -m "수정 내용"
     git push
     ```
   - **B. Git 없이 (웹 브라우저만)**: GitHub 저장소 → 바꿀 폴더(예: `public`)로 이동 → **Add file → Upload files** → 바뀐 파일(예: `index.html`, `sw.js`)을 끌어다 놓기 → 아래 **Commit changes**. 같은 이름 파일은 덮어써집니다. 폴더가 다른 파일(`README.md`는 맨 위 폴더)은 그 폴더에서 따로 올립니다.
3. **확인**: Netlify → 프로젝트 → **Deploys**에서 맨 위 배포가 `Published`가 되면 완료. 휴대폰은 앱을 껐다 다시 열면 새 버전이 적용됩니다(⋯ 메뉴의 버전으로 확인).

> 점검 기록은 Netlify 서버(Netlify Blobs)에 있어서 다시 배포해도 지워지지 않습니다. 기록은 `순번|장비ID`로 지점과 연결되므로 일차 순서를 바꾸거나 지점을 지워도 다른 지점의 기록은 그대로입니다(지운 지점의 기록은 서버에 남지만 화면·CSV에는 나오지 않음).

## 비용 (Netlify 무료 플랜 기준, 대략)

- 무료 플랜: 월 300 크레딧. **배포 1회 = 15 크레딧** → 배포는 필요할 때만.
- 공유 동기화: 화면이 켜져 있을 때만 20초마다 확인. 5명이 하루 6시간씩 켜 두는 정도면 월 약 50~70 크레딧 예상.
- 실제 사용량은 Netlify → Usage 에서 확인하세요. 더 아끼려면 `index.html`의 `POLL_MS`(20000 = 20초)를 늘리면 됩니다.

## 다른 배포 방법: Netlify CLI (Node.js 22 이상 설치 필요)

```bash
npm install
npx netlify-cli login
npx netlify-cli deploy --build --prod
```
