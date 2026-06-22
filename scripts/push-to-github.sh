#!/bin/bash
set -e

REPO="djjavierc-droid/Pdf-create"
BRANCH="main"

echo "Configurando remote de GitHub..."
git remote remove github 2>/dev/null || true
git remote add github "https://djjavierc-droid:${GITHUB_TOKEN}@github.com/${REPO}.git"

echo "Subiendo código a GitHub..."
git push github HEAD:${BRANCH} --force

echo ""
echo "Listo! El código ya está en: https://github.com/${REPO}"
