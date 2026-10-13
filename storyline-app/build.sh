#!/bin/zsh
# 순정 Electron.app 에 앱 코드를 넣어 "캐릭터 스토리라인.app" 조립
set -e
cd "$(dirname "$0")"
ZIP=$(ls ~/Library/Caches/electron/electron-v*-darwin-arm64.zip | tail -1)
OUT="dist/캐릭터 스토리라인.app"
rm -rf dist/_el "$OUT"; mkdir -p dist/_el
unzip -q "$ZIP" -d dist/_el
mv dist/_el/Electron.app "$OUT"; rm -rf dist/_el
mkdir -p "$OUT/Contents/Resources/app"
cp main.js store.js preload.js index.html package.json "$OUT/Contents/Resources/app/"
cp -R storage styles src "$OUT/Contents/Resources/app/"      # 저장소 모듈 · 화면 코드 (CSS · JS 나눠 둔 폴더)
[ -f icon.icns ] && cp icon.icns "$OUT/Contents/Resources/electron.icns"      # 앱 아이콘
P="$OUT/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName 캐릭터 스토리라인" -c "Set :CFBundleIdentifier local.character.storyline" "$P"
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string 캐릭터 스토리라인" "$P" 2>/dev/null || true
xattr -cr "$OUT"
codesign --force --deep --sign - "$OUT"
echo "built: $OUT"
