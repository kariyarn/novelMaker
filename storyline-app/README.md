# 캐릭터 스토리라인

캐릭터 중심 스토리라인 노트 앱 (Electron). 노트, 캐릭터, 설정, 타임라인을 작품별로 따로 저장합니다.

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
| `index.html` | 화면 전체 (HTML + CSS + JS 한 파일) |
| `main.js` | Electron 메인 프로세스, 메뉴, 저장소 연결 |
| `store.js` | 파일 저장소: 작품별 저장, 원자적 쓰기, 로컬 미러, 압축 백업, 복구 |
| `preload.js` | 화면 ↔ 저장소 연결 다리 |
| `build.sh` | 앱 조립 스크립트 |

## 데이터 위치

- 주 저장: `iCloud Drive/캐릭터 스토리라인/` (iCloud 가 없으면 `~/Documents/캐릭터 스토리라인/`)
  - `library.json` 작품 목록 · `prefs.json` 앱 전체 취향 · `works/<작품>/` 작품 데이터와 백업
  - `이전 버전/` 예전 단일 파일 구조에서 옮겨 둔 원본
- 로컬 사본: `~/Library/Application Support/캐릭터 스토리라인/data/`

## 테스트할 때

환경변수 `STORYLINE_DATA_DIR=/임시/폴더` 를 주고 실행하면 실제 데이터를 건드리지 않고 별도 폴더에서 동작합니다.
