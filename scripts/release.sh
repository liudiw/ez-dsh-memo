#!/bin/bash
# 发布：在临时目录里改名打包，绝不改动工作区的 package.json（本机安装名必须是 @local/dsh-memo）
set -euo pipefail
VERSION=${1:?用法: scripts/release.sh 0.1.1}
cd "$(dirname "$0")/.."
SRC=$(pwd)
TMP=$(mktemp -d)
cp -r index.js client.js sync.js cordis.patch.yml icon.svg icons locale LICENSE README.md "$TMP"/ 2>/dev/null
cd "$TMP"
node -e "const f=require('fs');const p=JSON.parse(f.readFileSync('$SRC/package.json','utf8'));p.name='ez-dsh-memo';p.version='$VERSION';delete p.private;f.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
npm pack >/dev/null
TGZ="ez-dsh-memo-$VERSION.tgz"
cp "$TGZ" "ez-dsh-memo.tgz"
cd "$SRC"
git -c user.name=liudiw -c user.email=liudiw@users.noreply.github.com add -A
git -c user.name=liudiw -c user.email=liudiw@users.noreply.github.com commit -qm "release v$VERSION" || true
git push -q origin master || true
gh release create "v$VERSION" "$TMP/$TGZ" "$TMP/ez-dsh-memo.tgz" \
  --title "ez-dsh-memo $VERSION" \
  --notes "便签墙插件。本版新增：设置 → 便签墙（fast-note-sync 配置页，token 只显示尾号）；宿主 syncConfig 接口；PWA 注入改为 opt-in；修复 Alt+W 逐层关闭、抽屉键盘导航、分类多选等。" 2>&1 | tail -2
echo "已发布 v$VERSION（含 ez-dsh-memo.tgz 固定名附件）"
