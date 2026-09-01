#!/usr/bin/env bash
# ============================================================
# Halo 暗色模式插件 — 本地构建与受控发布脚本
# 默认：检查工作区 → 递增版本 → 前端质量门 → 构建 → 校验 JAR。
# 可选：--commit 创建本地提交；--tag 创建本地 Tag；--release 创建 GitHub Release。
# 本项目不允许脚本执行 push，--push 参数会直接拒绝。
#
# 用法:
#   ./scripts/release.sh [patch|minor|major]
#       [--commit] [--tag] [--release] [--yes] [--dry-run] [--no-bump]
#
#   patch      1.1.6 → 1.1.7（默认）
#   minor      1.1.6 → 1.2.0
#   major      1.1.6 → 2.0.0
#   --commit   构建校验通过后，按明确文件范围创建本地提交
#   --tag      在本地提交之后创建本地 Tag（需要 --commit；--no-bump 除外）
#   --release  在本地 Tag 指向校验通过后创建 GitHub Release（需要 --tag）
#   --yes      跳过交互确认
#   --dry-run  只检查工作区并预览动作，不改文件、不构建、不发布
#   --no-bump  使用 gradle.properties 当前版本，不递增版本
#   --push     明确拒绝，本项目不允许脚本自动 push
#
# 依赖: git / gh（仅 --release）/ pnpm / Node / JDK
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GRADLE_PROPS="gradle.properties"
JAVA_FILE="src/main/java/top/liuhangyv/darkmode/DarkModePlugin.java"
CHANGELOG_FILE="CHANGELOG.md"
GH_REPO="LHY0125/halo-dark-mode-plugin"

CONFIRM_ALL=""
COMMIT=""
TAG=""
RELEASE=""
DRY_RUN=""
NO_BUMP=""
bump_type="patch"

for arg in "$@"; do
  case "$arg" in
    --yes) CONFIRM_ALL=1 ;;
    --commit) COMMIT=1 ;;
    --tag) TAG=1 ;;
    --release) RELEASE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-bump) NO_BUMP=1 ;;
    --push)
      echo "错误: 本项目禁止 release.sh 自动 push；请移除 --push 后重新执行。" >&2
      exit 2
      ;;
    patch|minor|major) bump_type="$arg" ;;
    *)
      echo "未知参数: $arg" >&2
      echo "用法: $0 [patch|minor|major] [--commit] [--tag] [--release] [--yes] [--dry-run] [--no-bump]" >&2
      exit 2
      ;;
  esac
done

if [[ -n "$RELEASE" && -z "$TAG" ]]; then
  echo "错误: --release 必须与 --tag 一起使用。" >&2
  exit 2
fi
if [[ -n "$TAG" && -z "$COMMIT" && -z "$NO_BUMP" ]]; then
  echo "错误: 递增版本时 --tag 必须与 --commit 一起使用。" >&2
  exit 2
fi
if [[ -n "$COMMIT" && -n "$NO_BUMP" ]]; then
  echo "错误: --no-bump 不产生版本文件改动，不能使用 --commit。" >&2
  exit 2
fi

confirm() {
  local prompt="$1"
  if [[ -n "$CONFIRM_ALL" || ! -t 0 ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

require_clean_worktree() {
  local status
  status="$(git status --porcelain=v1 --untracked-files=all)"
  if [[ -n "$status" ]]; then
    echo "错误: 工作区存在未提交改动，已停止发布流程。" >&2
    echo "$status" >&2
    echo "请先由用户决定这些改动的归属，再重新执行脚本。" >&2
    exit 3
  fi
}

current="$(grep '^version=' "$GRADLE_PROPS" | tr -d '\r' | head -n 1)"
current="${current#version=}"
if [[ ! "$current" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "错误: 无法解析版本号: $current" >&2
  exit 2
fi
IFS='.' read -r v_major v_minor v_patch <<<"$current"

if [[ -n "$NO_BUMP" ]]; then
  new_version="$current"
else
  case "$bump_type" in
    patch) v_patch=$((v_patch + 1)) ;;
    minor) v_minor=$((v_minor + 1)); v_patch=0 ;;
    major) v_major=$((v_major + 1)); v_minor=0; v_patch=0 ;;
  esac
  new_version="$v_major.$v_minor.$v_patch"
fi

jar_path="build/libs/plugin-dark-mode-$new_version.jar"
tag_name="v$new_version"

require_clean_worktree

if [[ -n "$DRY_RUN" ]]; then
  echo "[dry-run] 工作区干净。"
  echo "[dry-run] 当前版本: $current"
  echo "[dry-run] 目标版本: $new_version"
  echo "[dry-run] 构建产物: $jar_path"
  echo "[dry-run] 本地提交: $([[ -n "$COMMIT" ]] && echo 是 || echo 否)"
  echo "[dry-run] 本地 Tag: $([[ -n "$TAG" ]] && echo "$tag_name" || echo 否)"
  echo "[dry-run] GitHub Release: $([[ -n "$RELEASE" ]] && echo "$tag_name" || echo 否)"
  echo "[dry-run] push: 禁止"
  exit 0
fi

confirm "确认执行 v$new_version 的本地构建流程？" || { echo "已取消。"; exit 0; }

if [[ -z "$NO_BUMP" ]]; then
  sed -i "s/^version=.*/version=$new_version/" "$GRADLE_PROPS"
  sed -i "s/@since .*/@since $new_version/" "$JAVA_FILE"
  echo "已更新版本: $current → $new_version"
fi

echo "== 前端质量门（纯检查，不自动修复） =="
(cd ui && pnpm type-check && pnpm lint:check)

echo "== Gradle 构建（包含前端构建、单测和 JAR bundle 校验） =="
./gradlew build --console=plain

if [[ ! -f "$jar_path" ]]; then
  echo "错误: 未找到精确版本 JAR: $jar_path" >&2
  exit 4
fi
echo "JAR 校验已通过: $jar_path"

notes_file="$(mktemp)"
cleanup() {
  rm -f "$notes_file"
}
trap cleanup EXIT

section="$(awk -v v="v$new_version" '$0 ~ "^## " v "([^#A-Za-z0-9.]|$)" { flag=1; next } flag && /^## / { exit } flag' "$CHANGELOG_FILE" 2>/dev/null || true)"
if [[ -n "$section" ]]; then
  {
    echo "Halo 深色模式 v$new_version"
    echo ""
    echo "$section"
  } > "$notes_file"
  echo "已从 CHANGELOG.md 提取 v$new_version 发布日志。"
elif [[ -n "$COMMIT" || -n "$RELEASE" ]]; then
  echo "错误: CHANGELOG.md 没有 v$new_version 段落，禁止创建缺少详细日志的发布提交或 Release。" >&2
  exit 5
else
  {
    echo "Halo 深色模式 v$new_version"
    echo ""
    echo "注意：CHANGELOG.md 尚未记录 v$new_version；当前仅执行本地构建，未创建 Release。"
  } > "$notes_file"
  echo "警告: CHANGELOG.md 没有 v$new_version 段落；本地构建仍可继续。"
fi

if [[ -z "$COMMIT" && -z "$TAG" && -z "$RELEASE" ]]; then
  echo "仅完成本地构建和产物校验，未执行 commit、Tag、Release 或 push。"
  exit 0
fi

if [[ -z "$COMMIT" && -n "$TAG" && -z "$NO_BUMP" ]]; then
  echo "错误: --tag 没有对应的本地提交动作。" >&2
  exit 2
fi

commit_sha=""
if [[ -n "$COMMIT" ]]; then
  echo "== 准备本地提交（明确文件范围） =="
  release_files=(
    "$GRADLE_PROPS"
    "$JAVA_FILE"
    "$CHANGELOG_FILE"
    "README.md"
    "build.gradle"
    "settings.gradle"
    "pnpm-workspace.yaml"
    ".github/workflows/release.yml"
    "ui/build.gradle"
    "ui/package.json"
    "ui/pnpm-lock.yaml"
    "ui/vite.config.ts"
    "ui/tsconfig.json"
    "ui/tsconfig.app.json"
    "ui/tsconfig.node.json"
    "ui/tsconfig.vitest.json"
    "ui/eslint.config.ts"
    "ui/env.d.ts"
    "src/main/java"
    "src/main/resources"
    "ui/src"
    "scripts/release.sh"
    "scripts/README.md"
    "scripts/verify-toggle.py"
    "third-party/darkreader"
  )

  for release_file in "${release_files[@]}"; do
    if [[ ! -e "$release_file" ]]; then
      echo "错误: 发布清单中的文件或目录不存在: $release_file" >&2
      exit 6
    fi
  done

  git add -- "${release_files[@]}"
  if git diff --cached --quiet; then
    echo "错误: 暂存区为空，无法创建发布提交。" >&2
    exit 6
  fi
  git diff --cached --check
  echo "== 暂存区文件 =="
  git diff --cached --name-status

  confirm "确认创建本地提交 chore: 发布 $tag_name？" || {
    git reset >/dev/null
    echo "已取消提交；版本文件仍保留为 $new_version，请按需处理。"
    exit 0
  }

  git commit -m "chore: 发布 $tag_name"
  commit_sha="$(git rev-parse HEAD)"
  echo "本地提交已创建: $commit_sha"
elif [[ -n "$TAG" ]]; then
  # --no-bump + --tag 只标记当前已经存在的提交，不创建空的发布提交。
  commit_sha="$(git rev-parse HEAD)"
  echo "使用当前提交创建 Tag: $commit_sha"
fi

if [[ -n "$TAG" ]]; then
  if git rev-parse --verify --quiet "refs/tags/$tag_name" >/dev/null; then
    existing_tag_sha="$(git rev-parse "$tag_name^{commit}")"
    if [[ "$existing_tag_sha" != "$commit_sha" ]]; then
      echo "错误: 已存在的本地 Tag 未指向目标提交: $tag_name" >&2
      echo "  现有提交: $existing_tag_sha" >&2
      echo "  目标提交: $commit_sha" >&2
      exit 7
    fi
    echo "复用已存在且已校验的本地 Tag: $tag_name → $commit_sha"
  else
    git tag -a "$tag_name" -m "Halo 暗色模式 $tag_name" "$commit_sha"
    tag_sha="$(git rev-parse "$tag_name^{commit}")"
    if [[ "$tag_sha" != "$commit_sha" ]]; then
      echo "错误: 本地 Tag 未指向刚创建的提交。" >&2
      exit 7
    fi
    echo "本地 Tag 已创建并校验: $tag_name → $commit_sha"
  fi
fi

if [[ -n "$RELEASE" ]]; then
  command -v gh >/dev/null 2>&1 || { echo "错误: --release 需要 gh CLI。" >&2; exit 8; }
  confirm "确认创建 GitHub Release $tag_name？" || { echo "已保留本地提交和 Tag，未创建 Release。"; exit 0; }
  gh release create "$tag_name" \
    --repo "$GH_REPO" \
    --target "$commit_sha" \
    --title "$tag_name" \
    --notes-file "$notes_file" \
    "$jar_path"
  echo "GitHub Release 已创建: $tag_name"
fi

echo "完成：未执行 push。"
