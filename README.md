# 국도 ITS 장애감시장치 · 요일별 점검 동선

카카오맵 위에 요일별 점검 동선을 보여 주고, 지점마다 **완료 / 이상있음 / 메모**를 기록하는 웹앱(휴대폰 홈 화면 앱 가능)입니다.
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
3. 같은 화면의 **Environment variables**에 추가:
   - Key: `TEAM_CODE`, Value: 팀원끼리 공유할 코드(예: `판암점검2026`) — **꼭 설정하세요.** 없으면 주소만 알면 누구나 기록을 바꿀 수 있습니다.
4. **Deploy** → 1~2분 뒤 `https://○○○.netlify.app` 주소가 생깁니다.
   - 주소를 바꾸려면: Project configuration → General → **Change project name** (카카오 등록 전에 바꾸세요).
   - 배포 후에 TEAM_CODE를 추가·변경했다면 Deploys → **Trigger deploy**로 한 번 다시 배포해야 적용됩니다.

### 3) 카카오 도메인 등록 (지도 표시용)

카카오 개발자 사이트 → 내 애플리케이션 → 해당 앱 → **플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인**에
`https://○○○.netlify.app` 을 추가하고 몇 분 기다린 뒤 새로고침합니다.

### 4) 팀원 안내

1. 휴대폰에서 주소 열기 → **팀 코드** 입력 → 첫 기록 때 **점검자 이름** 입력(기록에 이름·시간이 남음).
2. 공유 메뉴 → **홈 화면에 추가** 하면 앱처럼 쓸 수 있습니다.
3. 오른쪽 위 표시: `● 공유 중`(정상) · `대기 n`(인터넷이 끊겨 n건이 휴대폰에 보관 중, 연결되면 자동 업로드) · `팀 코드`(코드 입력 필요) · `이 기기만`(서버 없이 열린 경우).

## 운영

- **기록 방법**: 지점을 누르면 정보창이 열립니다.
  - `✓ 완료` 한 번 → 로그 `이름 - 완료` (지도 핀이 초록색 "완료"로 바뀜)
  - `⚠ 이상있음` → **이상 사유 필수** → 로그 `이름 - 이상 사유` (지도 핀 빨간색 "이상")
  - 완료/이상 뒤에는 `완료 취소`·`이상 취소`(취소 사유 선택), 이상일 때는 `사유 수정`·`조치 완료` 버튼이 나옵니다.
- **작업 로그**: ⋯ 메뉴 → "작업 로그 (점검자별)". 모든 기록을 최신순으로, 점검자별로 골라 볼 수 있고 줄을 누르면 그 지점으로 이동합니다.
- **새 점검 회차 시작**: ⋯ 메뉴 → "새 점검 회차 시작". 모든 팀원 화면의 기록이 비워집니다. 이전 기록은 서버에 보관본(`archive/날짜시각`)으로 남지만, 시작 전에 **CSV 내보내기**로 받아 두는 것을 권장합니다.
- **CSV 내보내기**: ⋯ 메뉴. 팀 전체 기록 + 수정 이력(누가·언제)이 들어 있습니다. 엑셀에서 바로 열립니다.
- **동시에 같은 지점을 고친 경우**: 더 나중에 누른 기록이 최종 상태가 되고, 모든 변경은 이력에 남습니다. 오프라인으로 늦게 올라온 예전 기록은 최신 상태를 덮지 않고 이력에만 들어갑니다.
- **보관본 확인**: Netlify → 프로젝트 → **Blobs** → `inspection` 저장소.

## 수정 후 다시 배포

```bash
git add .
git commit -m "수정 내용"
git push
```

push 하면 Netlify가 자동으로 다시 배포합니다. 휴대폰은 다음에 앱을 열 때 새 버전이 적용됩니다.

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

환경 변수는 `npx netlify-cli env:set TEAM_CODE 팀코드` 로 설정합니다.
