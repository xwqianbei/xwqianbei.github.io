#!/bin/bash
# Deploy script: generate and copy to root for GitHub Pages
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
NODE="/Users/xw/.nvm/versions/node/v24.11.0/bin/node"
HEXO="$SCRIPT_DIR/node_modules/.bin/hexo"

echo "==> Cleaning..."
$NODE $HEXO clean

echo "==> Generating..."
$NODE $HEXO generate

echo "==> Copying to root..."
# List of generated directories/files to copy
cp -r "$SCRIPT_DIR/public/"* "$ROOT_DIR/"

echo "==> Done! Files deployed to $ROOT_DIR"
