#!/usr/bin/env bash
# ============================================================
# Halo 暗色模式插件 — 一键发布脚本
# 一条命令完成：递增版本 → 同步 @since → 前端质量门 → 构建
#              → 校验 JAR → 生成发布日志 → gh release → commit/tag/push
#
# 用法:
#   ./scripts/release.sh [patch|minor|major] [--push] [--yes] [--dry-run]
#     patch  → 1.1.0 → 1.1.1（默认）
#     minor  → 1.1.0 → 1.2.0
#     major  → 1.1.0 → 2.0.0
#     --push     提交后自动 push main + tag（否则打印推送提示）
#     --yes      跳过所有交互确认（供 Claude / CI 非交互调用）
#     --dry-run  只预览版本递增与文件改动，不构建、不发布
#
# 依赖: git / gh / pnpm / Node / JDK（gradle.properties 已硬编码）
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GRADLE_PROPS="gradle.properties"
JAVA_FILE="src/main/java/run/halo/darkmode/DarkModePlugin.java"
GH_REPO="LHY0125/halo-dark-mode-plugin"

# ---- 参数解析 ----
CONFIRM_ALL=""
PUSH=""
DRY_RUN=""
bump_type="patch"

for arg in "$@"; do
  case "$arg" in
    --yes) CONFIRM_ALL=1 ;;
    --push) PUSH=1 ;;
    --dry-run) DRY_RUN=1 ;;
    patch|minor|major) bump_type="$arg" ;;
    *) echo "未知参数: $arg" >&2; echo "用法: $0 [patch|minor|major] [--push] [--yes] [--dry-run]" >&2; exit 1 ;;
  esac
done

# 交互确认：--yes 或非 TTY（Claude 调用）时自动继续
confirm() {
  local prompt="$1"
  if [[ -n "$CONFIRM_ALL" || ! -t 0 ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

# ---- 1. 读当前版本（注意 Windows CRLF） ----
current="$(grep '^version=' "$GRADLE_PROPS" | tr -d '\r')"
current="${current#version=}"
IFS='.' read -r v_major v_minor v_patch <<<"$current"

case "$bump_type" in
  patch) v_patch=$((v_patch + 1)) ;;
  minor) v_minor=$((v_minor + 1)); v_patch=0 ;;
  major) v_major=$((v_major + 1)); v_minor=0; v_patch=0 ;;
esac
new_version="$v_major.$v_minor.$v_patch"

echo "版本: $current → $new_version ($bump_type)"

# ---- dry-run：只预览不落地 ----
if [[ -n "$DRY_RUN" ]]; then
  echo ""
  echo "[dry-run] 将更新以下内容："
  echo "  $GRADLE_PROPS  : version=$new_version"
  echo "  $JAVA_FILE     : @since $new_version"
  echo "  JAR 产物        : build/libs/plugin-dark-mode-$new_version.jar"
  echo "  Release         : gh release create v$new_version (repo $GH_REPO)"
  echo "  推送             : main + tag v$new_version"
  echo ""
  echo "[dry-run] 未做任何修改。"
  exit 0
fi

confirm "确认升级到 $new_version 并执行构建 + 发布？" || { echo "已取消"; exit 0; }

# ---- 2. 同步版本到文件 ----
sed -i "s/^version=.*/version=$new_version/" "$GRADLE_PROPS"
sed -i "s/@since .*/@since $new_version/" "$JAVA_FILE"
echo "✅ 已更新 $GRADLE_PROPS + @since → $new_version"

# ---- 3. 前端质量门（类型 + lint） ----
echo "== 前端质量门（type-check + lint） =="
(cd ui && pnpm type-check && pnpm lint)

# ---- 4. 后端构建（自动含前端 build + 单测 pnpmCheck） ----
echo "== gradlew build =="
./gradlew build

# ---- 5. 校验 JAR 产物 ----
jar_path="build/libs/plugin-dark-mode-$new_version.jar"
if [[ ! -f "$jar_path" ]]; then
  echo "❌ 错误: 未找到 $jar_path" >&2
  exit 1
fi
echo "✅ JAR 已生成: $jar_path"

# ---- 6. 生成发布日志：优先从 CHANGELOG.md 提取，缺失则回退 git log ----
CHANGELOG_FILE="CHANGELOG.md"
notes_file="$(mktemp)"

section="$(awk -v v="v$new_version" '$0 ~ "^## " v "([^#A-Za-z0-9.]|$)" { flag=1; next } flag && /^## / { exit } flag' "$CHANGELOG_FILE" 2>/dev/null)"
if [[ -f "$CHANGELOG_FILE" && -n "$section" ]]; then
  {
    echo "Halo 深色模式 v$new_version"
    echo ""
    echo "$section"
  } > "$notes_file"
  echo "✅ 已从 CHANGELOG.md 提取 v$new_version 发布日志"
else
  prev_tag="$(git describe --tags --abbrev=0 2>/dev/null || echo '')"
  {
    echo "Halo 深色模式 v$new_version"
    echo ""
    if [[ -n "$prev_tag" ]]; then
      echo "⚠️ CHANGELOG.md 未记录 v$new_version，以下为 git log 摘要（建议发布后补充 CHANGELOG）："
      echo ""
      git log --oneline "$prev_tag"..HEAD | sed 's/^/- /'
    else
      echo "首次发布"
    fi
  } > "$notes_file"
  echo "⚠️ CHANGELOG.md 未找到 v$new_version 段落，已回退为 git log 摘要"
fi
echo ""
echo "== 发布日志草案 =="
cat "$notes_file"
echo ""
echo "（如需调整可编辑: $notes_file）"

confirm "按上述日志创建 GitHub Release？" || {
  echo "已取消 Release（版本文件已更新、JAR 已构建，可手动处理）"
  exit 0
}

# ---- 7. 创建 GitHub Release（附 JAR） ----
gh release create "v$new_version" \
  --repo "$GH_REPO" \
  --title "v$new_version" \
  --notes-file "$notes_file" \
  "$jar_path"
echo "✅ Release v$new_version 已创建"

# ---- 8. commit + tag + push ----
git add "$GRADLE_PROPS" "$JAVA_FILE"
git commit -m "chore: 升级 $new_version 正式版"
git tag "v$new_version"

if [[ -n "$PUSH" ]]; then
  git push
  git push origin "v$new_version"
  echo "✅ 已推送 main 与 tag v$new_version"
else
  echo "已提交并打 tag v$new_version。如需推送："
  echo "  git push && git push origin v$new_version"
fi

echo ""
echo "🎉 完成：v$new_version"
