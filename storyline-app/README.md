# 캐릭터 스토리라인

캐릭터 중심 스토리라인 노트 앱 (Electron). 노트, 캐릭터, 설정, 타임라인을 작품별로 따로 저장합니다.

## 회사 PC(Windows) · 집 맥에서 같이 쓰기

### 1. 앱 받기
- GitHub 저장소 → **Actions** → `build` → 맨 위 실행 → **Artifacts**
  - `windows-setup`: Windows 설치 파일 (`storyline-setup-….exe`, 관리자 권한 없이 내 계정에만 설치)
  - `mac-app`: 맥 앱 (zip)
- main 에 올리면 자동으로 만들어지고, Actions 탭의 **Run workflow** 로 직접 돌려도 돼요.
- 서명이 없는 앱이라 처음 열 때 Windows 는 "Windows의 PC 보호" → **추가 정보 → 실행**, 맥은 우클릭 → **열기**.

### 2. GitHub 동기화
1. GitHub 에서 **비공개(Private)** 저장소를 하나 만들어요 (README 포함).
2. Settings → Developer settings → **Fine-grained tokens** → 새 토큰
   - Repository access: **그 저장소만** · Permissions: **Contents → Read and write** 하나만
3. 앱 → 설정 → 데이터 → **GitHub 동기화 → 연결하기** 에 저장소(`아이디/이름`) 와 토큰을 넣어요. 두 컴퓨터 모두.
- 올리기는 자동(고친 뒤 5초쯤 · 끌 때), 받기는 직접: 다른 기기에서 고친 게 있으면 위에 알림 띠가 뜨고 **받기**를 눌러야 받아요. (파일 메뉴 → 다른 기기 내용 받기)
- 저장소의 `storyline/` 폴더에 작품 목록 · 앱 취향 · 작품 데이터가 올라가요. 자동 백업은 컴퓨터마다 따로.
- 양쪽에서 같은 작품을 고쳤다면: 이 컴퓨터 것은 그대로 두고, 다른 컴퓨터 것은 **"작품 이름 (다른 기기 날짜)"** 사본 작품으로 남겨요. 지워지는 건 없어요.
- 토큰은 그 컴퓨터 안에만 OS 열쇠고리(맥 키체인 · Windows 자격 증명)로 암호화해서 보관해요.

### 3. 포스트잇 모드 (조용히 쓰기)
- **⌘⌥N** (Windows **Ctrl+Alt+N**): 큰 창을 치우고 화면 구석에 작은 포스트잇 창만 띄워요. 다시 누르면 숨김. 앱이 뒤에 있어도 돼요.
- 테두리 · 메뉴 · 작업 표시줄 아이콘 없음. 색 없는 종이 (화면이 밝은 모드면 흰색 · 어두운 모드면 검은색). 슬라이드로 투명도(15 ~ 100%), 핀으로 항상 위에 두기.
- 쓰는 대로 지금 작품에 카드로 저장돼요. **⌘/Ctrl+Enter** 새 포스트잇, **Alt+← →** 지난 포스트잇 넘기며 고치기, **Esc** 숨기기, ⤢ 큰 창 열기.
- 위쪽 바의 포스트잇 버튼(검색 옆), 메뉴(⋯) → 포스트잇 모드, 보기 메뉴 → 포스트잇 모드 로도 열 수 있어요.
- Windows: 알림 영역(시계 옆) 아이콘 클릭 · 작업 표시줄 아이콘 우클릭 → **포스트잇 모드로 열기** (`--note`). 맥: Dock 아이콘 우클릭 → 포스트잇 모드.

## 앱 다시 만들기 (macOS, Apple Silicon)

```bash
./build.sh
```

- 결과: `dist/캐릭터 스토리라인.app` → `~/Applications` 로 복사해서 사용
- Electron 배포본(zip)이 `~/Library/Caches/electron/` 에 있어야 합니다.
  없으면 먼저 `npm install` 을 한 번 실행하세요 (package.json 에 electron 이 있어요).

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 뼈대 (HTML) + CSS · JS 파일을 순서대로 불러옴 |
| `styles/` | 화면 모양 (CSS). `index.html` 에 적힌 순서대로 겹쳐 적용 |
| `src/` | 화면 동작 (JS). 아래 "화면 코드 구성" 참고 |
| `main.js` | Electron 메인 프로세스, 메뉴, 저장소 연결 |
| `store.js` | 파일 저장소 창구: `storage/` 모듈을 묶어 main.js 에 내놓음 |
| `storage/` | 저장소 모듈: `layout`(폴더 구조) · `files`(원자적 쓰기) · `library`(작품 목록) · `legacy`(예전 구조 옮기기) · `works`(작품 데이터) · `backups`(압축 백업) · `prefs`(앱 전체 취향) · `log`(오류 기록) |
| `storage/sync.js` | GitHub 동기화 (GitHub API 로 올리기 `push` · 확인 `check` · 받기 `sync` · 양쪽에서 고치면 카드 단위로 합침) |
| `note/` | 포스트잇 창 (작은 창 화면 · 다리) |
| `build/icon.png` | Windows · 맥 앱 아이콘 (electron-builder) |
| `test/` | 저장소 · 동기화 테스트 (`npm test`) |
| `preload.js` | 화면 ↔ 저장소 연결 다리 |
| `build.sh` | 앱 조립 스크립트 |

## 화면 코드 구성 (`src/`)

| 폴더 | 내용 |
|---|---|
| `core/` | 공통 도구 (`$`, `h`, 아이콘, 탭) |
| `model/` | 데이터 모양 (인물 · 카드 · 화 만들기, 장르별 예시 작품) |
| `state/` | `repository.js` 저장 창구(앱/브라우저 차이를 숨김) · 현재 작품 상태 `S` · 보기 상태 `UI`/`UIP` · 저장 · 되돌리기 · 찾아보기 색인 |
| `views/` | 화면 그리기 (왼쪽 목록, 인물 시트, 보드, 타임라인, 관계망, 오른쪽 목록 …) |
| `features/` | 기능 단위 (집중 모드, 끌어다 놓기, 여러 장 선택, 검색, 내보내기, 작품 관리 …) |
| `ui/` | 대화상자 · 팝오버 · 둘러보기 |
| `modals/` | 설정 창 |
| `input/` | 단축키 · 스마트 입력 |
| `boot.js` | 시작 코드: 모든 파일을 불러온 뒤 맨 마지막에 실행 |

- **새단장 화면** (설정 → 겉모습 → 화면 디자인 → 새단장): `U3()` 일 때만 켜짐. 그리는 코드는 `features/fresh.js`, 모양은 `styles/fresh.css`(모두 `body.ui3` 아래).
- 모듈(`import`)이 아닌 일반 `<script>` 라서 파일끼리 전역 이름을 그대로 나눠 씀. **불러오는 순서가 중요**합니다.
- 파일 맨 위에서 바로 실행되는 코드는 **앞쪽 파일에 있는 함수만** 부를 수 있어요. 함수 안에서 부르는 건 상관없음.
- 새 파일을 만들면 `index.html` 의 `<script>` 목록에 넣어 주세요. (`build.sh` · `package.json` 은 폴더째 복사)
- **가운데 화면**(관계망 · 폴더 표 · 보드 · 타임라인)은 각자 파일 끝에서 `registerMidView({id, order, match, appClass, render})` 로 등록해요.
  `order` 가 작은 것부터 `match()` 를 물어 처음 맞는 화면을 그림. 새 화면을 더할 때 `render.js` 는 고치지 않아도 됩니다.
- **데이터를 바꿀 때**는 `act(fn)`(되돌리기 기록 + 저장 + 다시 그리기) · `edit(fn)`(글자 입력처럼 잦은 변경: 다시 그리지 않음) · `commit()`(기록 없이 저장 + 다시 그리기)을 써요.
  상태 쪽(`state/`)은 화면을 모르고 `onStateChange` · `onSaveStatus` 로 알리기만 함.
- **저장**은 `Repo`(`state/repository.js`)만 거쳐요. 앱(Electron)과 브라우저의 차이는 그 안에서만 다룸.

## 데이터 위치

- 주 저장: `iCloud Drive/캐릭터 스토리라인/` (iCloud 가 없으면 `~/Documents/캐릭터 스토리라인/`)
  - `library.json` 작품 목록 · `prefs.json` 앱 전체 취향 · `works/<작품>/` 작품 데이터와 백업
  - `이전 버전/` 예전 단일 파일 구조에서 옮겨 둔 원본
- 로컬 사본: `~/Library/Application Support/캐릭터 스토리라인/data/`

## 테스트할 때

환경변수 `STORYLINE_DATA_DIR=/임시/폴더` 를 주고 실행하면 실제 데이터를 건드리지 않고 별도 폴더에서 동작합니다.
