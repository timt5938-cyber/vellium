#!/usr/bin/env bash
set -euo pipefail

release=${1:?Specify a release name}
[[ "$release" =~ ^[0-9]{8}-[0-9]{4}(-[a-z0-9]+)?$ ]] || { echo 'Invalid release name' >&2; exit 2; }

root=/opt/vellium-web
staged="/home/timoha/vellium-deploy-$release"
incoming="$root/.incoming-$release"
backup="$root/backup-$release"

test -f "$staged/index.html"
test -d "$staged/assets"
test ! -e "$incoming"
test ! -e "$backup"

mv "$staged" "$incoming"
# Keep hashed files from previous releases: open tabs can import them after a deploy.
if [ -d "$root/current/assets" ]; then
  cp -a --update=none "$root/current/assets/." "$incoming/assets/"
fi

mv "$root/current" "$backup"
if ! mv "$incoming" "$root/current"; then
  mv "$backup" "$root/current"
  exit 1
fi
printf 'Activated %s; previous release: %s\n' "$root/current" "$backup"
