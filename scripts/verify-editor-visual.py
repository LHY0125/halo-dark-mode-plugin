"""验证内容编辑页的真实计算样式，区分两种编辑页策略。"""
import argparse
import json
import pathlib
import re
import sys
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
DEFAULT_EDITOR_URL = "/console/posts/editor?name=019fe276-cd4a-7658-9acb-e3f6f0fc4266"
BASE = "https://blog.liuhangyv.top"
THEME_KEY = "halo-dark-mode-theme"
EDITOR_KEY = "halo-dark-mode-editor"


def set_storage(page, key: str, value: str) -> None:
    """通过 storage 事件驱动已加载的 useDarkMode 单例。"""
    page.evaluate(
        """([key, value]) => {
            localStorage.setItem(key, value)
            window.dispatchEvent(new StorageEvent('storage', {
                key,
                newValue: value,
            }))
        }""",
        [key, value],
    )


def read_style(page, selector: str) -> dict | None:
    return page.evaluate(
        """(selector) => {
            const element = document.querySelector(selector)
            if (!element) return null
            let current = element
            let effectiveBackgroundColor = 'rgba(255, 255, 255, 1)'
            while (current) {
                const currentBackground = getComputedStyle(current).backgroundColor
                if (!/^rgba?\\(\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*\\)$/.test(currentBackground)) {
                    effectiveBackgroundColor = currentBackground
                    break
                }
                current = current.parentElement
            }
            const style = getComputedStyle(element)
            return {
                selector,
                backgroundColor: style.backgroundColor,
                effectiveBackgroundColor,
                color: style.color,
                colorScheme: style.colorScheme,
                caretColor: style.caretColor,
                display: style.display,
            }
        }""",
        selector,
    )


def color_channels(value: str) -> tuple[int, int, int] | None:
    match = re.search(r"rgba?\(([^)]+)\)", value)
    if match is None:
        return None
    numbers = re.split(r"[,\s]+", match.group(1).strip())
    if len(numbers) < 3:
        return None
    try:
        return tuple(int(float(channel.strip())) for channel in numbers[:3])
    except ValueError:
        return None


def is_dark(value: str) -> bool:
    channels = color_channels(value)
    return channels is not None and sum(channels) / 3 < 150


def is_light(value: str) -> bool:
    channels = color_channels(value)
    return channels is not None and sum(channels) / 3 > 220


def background_color(style: dict | None) -> str:
    if style is None:
        return ''
    return style.get('effectiveBackgroundColor', style['backgroundColor'])


def has_contrast(style: dict | None) -> bool:
    if style is None:
        return False
    background = color_channels(background_color(style))
    foreground = color_channels(style["color"])
    if background is None or foreground is None:
        return False
    return abs(sum(background) / 3 - sum(foreground) / 3) >= 60


def wait_for_editor(page, expected_scope: str) -> None:
    page.wait_for_function(
        """(expectedScope) => {
            const root = document.documentElement
            return root.getAttribute('data-halo-theme') === 'dark'
                && root.getAttribute('data-halo-editor-scope') === expectedScope
                && root.getAttribute('data-darkreader-mode') === 'dynamic'
                && document.querySelector('.halo-rich-text-editor') !== null
        }""",
        expected_scope,
        timeout=20000,
    )


def editor_scope(editor_url: str) -> str:
    pathname = urlparse(editor_url).path.rstrip('/')
    if pathname == "/console/posts/editor":
        return "post-editor"
    if pathname == "/console/single-pages/editor":
        return "single-page-editor"
    raise ValueError(
        "--editor-url 必须是 /console/posts/editor 或 /console/single-pages/editor 路径"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="验证 Halo 内容编辑页真实计算样式")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
    parser.add_argument("--editor-url", default=DEFAULT_EDITOR_URL)
    parser.add_argument(
        "--policy",
        choices=("darkreader", "disable"),
        default="darkreader",
        help="编辑页策略；darkreader 为整页深色，disable 为编辑工作区浅色",
    )
    parser.add_argument(
        "--output",
        default=str(pathlib.Path(__file__).parent / "output" / "editor-visual.json"),
    )
    parser.add_argument(
        "--screenshot",
        default=str(pathlib.Path(__file__).parent / "output" / "editor-visual.png"),
    )
    args = parser.parse_args()
    expected_scope = editor_scope(args.editor_url)

    output_path = pathlib.Path(args.output)
    screenshot_path = pathlib.Path(args.screenshot)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)

    selectors = {
        "sidebar": "aside.sidebar",
        "editorRoot": ".halo-rich-text-editor",
        "editorHeader": ".halo-rich-text-editor .editor-header",
        "editorEntry": ".halo-rich-text-editor .editor-entry",
        "editorMain": ".halo-rich-text-editor .editor-main",
        "editorContent": ".halo-rich-text-editor .editor-main-content",
        "proseMirror": ".halo-rich-text-editor .ProseMirror",
        "editorExtra": ".halo-rich-text-editor .editor-entry-extra",
        "codeBlock": ".halo-rich-text-editor .ProseMirror pre",
    }

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            args.profile,
            channel="msedge",
            headless=True,
            viewport={"width": 1600, "height": 950},
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(args.base + "/console/dashboard", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        time.sleep(2)
        if "/login" in page.url:
            print("SESSION_EXPIRED 请先运行 scripts/login-wait.py")
            context.close()
            return 3

        set_storage(page, THEME_KEY, "dark")
        set_storage(page, EDITOR_KEY, args.policy)
        page.goto(args.base + args.editor_url, wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        wait_for_editor(page, expected_scope)

        styles = {name: read_style(page, selector) for name, selector in selectors.items()}
        state = page.evaluate(
            """() => ({
                url: location.href,
                theme: document.documentElement.getAttribute('data-halo-theme'),
                editorPolicy: document.documentElement.getAttribute('data-halo-editor-policy'),
                editorScope: document.documentElement.getAttribute('data-halo-editor-scope'),
                darkreader: document.documentElement.getAttribute('data-darkreader-mode'),
                colorScheme: document.documentElement.style.colorScheme,
                proseMirrorCount: document.querySelectorAll('.halo-rich-text-editor .ProseMirror').length,
                codeBlockCount: document.querySelectorAll('.halo-rich-text-editor .ProseMirror pre').length,
            })"""
        )
        page.screenshot(path=str(screenshot_path), full_page=True)
        context.close()

    root_style = styles["editorRoot"]
    sidebar_style = styles["sidebar"]
    prose_style = styles["proseMirror"]
    state_pass = (
        state["theme"] == "dark"
        and state["editorPolicy"] == args.policy
        and state["editorScope"] == expected_scope
        and state["darkreader"] == "dynamic"
        and state["colorScheme"] == "dark"
    )
    if args.policy == "darkreader":
        editor_pass = all(
            style is not None and is_dark(background_color(style))
            for style in (root_style, styles["editorHeader"], styles["editorContent"], prose_style)
        )
    else:
        editor_pass = all(
            style is not None and is_light(background_color(style))
            for style in (root_style, styles["editorHeader"], styles["editorContent"], prose_style)
        )
    extra_style = styles["editorExtra"]
    extra_pass = extra_style is None or (
        is_dark(background_color(extra_style))
        if args.policy == "darkreader"
        else is_light(background_color(extra_style))
    )
    sidebar_pass = bool(sidebar_style and is_dark(background_color(sidebar_style)))
    code_block = styles["codeBlock"]
    code_block_pass = code_block is None or has_contrast(code_block)
    result = {
        "policy": args.policy,
        "state": state,
        "styles": styles,
        "checks": {
            "state": state_pass,
            "editorWorkspace": editor_pass,
            "editorExtra": extra_pass,
            "sidebarDark": sidebar_pass,
            "codeBlockObserved": state["codeBlockCount"] > 0,
            "codeBlockReadable": code_block_pass,
        },
        "screenshot": str(screenshot_path),
    }
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if state_pass and editor_pass and extra_pass and sidebar_pass and code_block_pass else 1


if __name__ == "__main__":
    sys.exit(main())
