#!/usr/bin/env bash
set -euo pipefail

archive=${1:?Release archive is required}
deploy_path=${2:?Deployment path is required}
release=${3:?Release identifier is required}
site_url=${4:?Customer site URL is required}

if [[ "$deploy_path" != /* ]]; then
  echo "Deployment path must be absolute" >&2
  exit 1
fi

if [[ ! "$release" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release identifier must be a full Git commit SHA" >&2
  exit 1
fi

releases_path="$deploy_path/releases"
release_path="$releases_path/$release"
staging_path="$releases_path/.${release}.staging"
current_link="$deploy_path/current"
next_link="$deploy_path/.current.next"
previous_release=""
had_current=false

cleanup() {
  rm -f "$archive" "$0" "$next_link"
  rm -rf "$staging_path"
}
trap cleanup EXIT

mkdir -p "$releases_path"
if [[ -L "$current_link" ]]; then
  had_current=true
  previous_release=$(readlink -f "$current_link")
fi

if [[ ! -d "$release_path" ]]; then
  rm -rf "$staging_path"
  mkdir -p "$staging_path"
  tar -xzf "$archive" -C "$staging_path"
  test -f "$staging_path/index.html"
  mv "$staging_path" "$release_path"
else
  test -f "$release_path/index.html"
fi

ln -s "$release_path" "$next_link"
mv -Tf "$next_link" "$current_link"

if ! curl --fail --silent --show-error --location \
  --retry 5 --retry-delay 2 --max-time 20 "$site_url" > /dev/null; then
  if [[ "$had_current" == true && -d "$previous_release" ]]; then
    ln -s "$previous_release" "$next_link"
    mv -Tf "$next_link" "$current_link"
    echo "Health check failed; restored $previous_release" >&2
  else
    rm -f "$current_link"
    echo "Health check failed; no previous release was available" >&2
  fi
  exit 1
fi

mapfile -t old_releases < <(find "$releases_path" -mindepth 1 -maxdepth 1 -type d \
  -printf '%T@ %p\n' | sort -rn | tail -n +6 | cut -d' ' -f2-)
for old_release in "${old_releases[@]}"; do
  if [[ "$old_release" != "$previous_release" ]]; then
    rm -rf "$old_release"
  fi
done

echo "Activated customer release $release"
