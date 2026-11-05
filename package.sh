#!/bin/sh
# Builds two upload ZIPs, each with index.html at the top level:
#   dist/chai-break-itch.zip       for itch.io and other websites
#   dist/chai-break-playables.zip  for the YouTube Playables Developer Portal
#
# The web build must not contain the Playables SDK. Inside any iframe, as on
# itch.io, the SDK assumes it is on YouTube and reports audio as off, which
# would silence the game.
set -e
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist/itch dist/playables

for target in itch playables; do
  cp -R style.css js "dist/$target/"
done
cp index.html dist/playables/index.html
grep -v -e 'game_api/v1' -e 'Playables SDK must load' index.html > dist/itch/index.html

if grep -q 'game_api' dist/itch/index.html; then
  echo "The itch.io build still contains the SDK" >&2
  exit 1
fi

for target in itch playables; do
  (cd "dist/$target" && zip -r -q "../chai-break-$target.zip" index.html style.css js -x '*.DS_Store')
done

ls -l dist/*.zip
