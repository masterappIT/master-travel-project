#!/usr/bin/env bash
set -euo pipefail

source_dir=${1:?Static build directory is required}
image=${2:?Image reference is required}

if [[ ! -f "$source_dir/index.html" ]]; then
  printf 'Static build is missing index.html: %s\n' "$source_dir" >&2
  exit 2
fi

docker buildx build \
  --platform linux/amd64 \
  --build-context "static=$source_dir" \
  --file deploy/frontend/Dockerfile \
  --tag "$image" \
  --push \
  --provenance=false \
  .
