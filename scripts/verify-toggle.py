"""验证主题切换：覆盖普通页和局部编辑工作区策略。"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
BASE = "https://blog.liuhangyv.top"
STORAGE_KEY = "halo-dark-mode-theme"
EDITOR_KEY = "halo-dark-mode-editor"


def read_state(page) -> dict:
    return page.evaluate(
        """() => ({
            attr: document.documentElement.getAttribute('data-halo-theme'),
            editorPolicy: document.documentElement.getAttribute('data-halo-editor-policy'),
            editorScope: document.documentElement.getAttribute('data-halo-editor-scope'),
            darkreader: document.documentElement.getAttribute('data-darkreader-mode'),
            stored: localStorage.getItem('halo-dark-mode-theme'),
            editorStored: localStorage.getItem('halo-dark-mode-editor'),
            colorScheme: document.documentElement.style.colorScheme,
        })"""
    )


def set_mode(page, mode: str) -> None:
    """写入持久化偏好并派发 storage 事件，让当前页面 useDarkMode 单例即时响应。"""
    page.evaluate(
        """([key, mode]) => {
            localStorage.setItem(key, mode)
            window.dispatchEvent(
                new StorageEvent('storage', { key: key, newValue: mode })
            )
        }""",
        [STORAGE_KEY, mode],
    )


def set_editor_policy(page, policy: str) -> None:
    """写入编辑页策略并派发 storage 事件，让当前页面即时响应。"""
    page.evaluate(
        """([key, policy]) => {
            localStorage.setItem(key, policy)
            window.dispatchEvent(
                new StorageEvent('storage', { key: key, newValue: policy })
            )
        }""",
        [EDITOR_KEY, policy],
    )


def wait_mode(page, expect_dark: bool) -> None:
    page.wait_for_function(
        """(expectDark) => {
            const attr = document.documentElement.getAttribute('data-halo-theme')
            const darkreader = document.documentElement.getAttribute('data-darkreader-mode')
            const scheme = document.documentElement.style.colorScheme
            if (expectDark) {
                return attr === 'dark' && darkreader === 'dynamic' && scheme === 'dark'
            }
            return attr === null && darkreader === null && scheme !== 'dark'
        }""",
        arg=expect_dark,
        timeout=15000,
    )


def wait_editor_state(page, policy: str, expect_scope: str) -> None:
    page.wait_for_function(
        """([policy, expectScope]) => {
            const root = document.documentElement
            const actualPolicy = root.getAttribute('data-halo-editor-policy')
            const actualScope = root.getAttribute('data-halo-editor-scope')
            const darkreader = root.getAttribute('data-darkreader-mode')
            const scheme = root.style.colorScheme
            if (actualPolicy !== policy) return false
            return actualScope === expectScope && darkreader === 'dynamic' && scheme === 'dark'
        }""",
        arg=[policy, expect_scope],
        timeout=15000,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="验证主题切换运行时行为")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
    parser.add_argument(
        "--editor-url",
        default="/console/posts/editor",
        help="编辑页路径；若页面需要资源名称，可传入完整路径和查询参数",
    )
    parser.add_argument(
        "--skip-editor",
        action="store_true",
        help="只验证普通 Dashboard，不执行编辑页策略场景",
    )
    args = parser.parse_args()

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            args.profile,
            channel="msedge",
            headless=True,
            viewport={"width": 1600, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(args.base + "/console/dashboard", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        time.sleep(3)
        if "/login" in page.url:
            print("SESSION_EXPIRED 请先运行 scripts/login-wait.py")
            ctx.close()
            return 3

        toggle_absent = page.locator(".theme-toggle, .plugin-dark-mode-toggle").count() == 0
        print(f"侧边栏注入按钮已移除: {'PASS' if toggle_absent else 'FAIL'}")

        # 先归一化到浅色，保证后续翻转判定与当前会话状态无关
        set_mode(page, "light")
        wait_mode(page, expect_dark=False)
        before = read_state(page)

        set_mode(page, "dark")
        wait_mode(page, expect_dark=True)
        after = read_state(page)

        set_mode(page, "light")
        wait_mode(page, expect_dark=False)
        restored = read_state(page)

        attr_flipped = before["attr"] != after["attr"] and before["attr"] == restored["attr"]
        stored_flipped = (
            before["stored"] != after["stored"] and before["stored"] == restored["stored"]
        )
        darkreader_flipped = (
            before["darkreader"] != after["darkreader"]
            and before["darkreader"] == restored["darkreader"]
        )
        scheme_flipped = (
            before["colorScheme"] != after["colorScheme"]
            and before["colorScheme"] == restored["colorScheme"]
        )
        print(f"初始: {before}")
        print(f"切换: {after}")
        print(f"还原: {restored}")
        print(
            f"属性翻转: {'PASS' if attr_flipped else 'FAIL'}  "
            f"存储翻转: {'PASS' if stored_flipped else 'FAIL'}  "
            f"Dark Reader 翻转: {'PASS' if darkreader_flipped else 'FAIL'}  "
            f"color-scheme 翻转: {'PASS' if scheme_flipped else 'FAIL'}"
        )

        editor_checks = []
        if not args.skip_editor:
            set_mode(page, "dark")
            wait_mode(page, expect_dark=True)

            set_editor_policy(page, "disable")
            page.goto(args.base + args.editor_url, wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass
            wait_editor_state(page, policy="disable", expect_scope="post-editor")
            disabled_state = read_state(page)
            disable_pass = (
                disabled_state["editorPolicy"] == "disable"
                and disabled_state["editorStored"] == "disable"
                and disabled_state["editorScope"] == "post-editor"
                and disabled_state["darkreader"] == "dynamic"
                and disabled_state["colorScheme"] == "dark"
            )
            print(f"编辑页局部浅色工作区策略: {'PASS' if disable_pass else 'FAIL'} {disabled_state}")
            editor_checks.append(disable_pass)

            set_editor_policy(page, "darkreader")
            wait_editor_state(page, policy="darkreader", expect_scope="post-editor")
            darkreader_state = read_state(page)
            darkreader_pass = (
                darkreader_state["editorPolicy"] == "darkreader"
                and darkreader_state["editorStored"] == "darkreader"
                and darkreader_state["editorScope"] == "post-editor"
                and darkreader_state["darkreader"] == "dynamic"
                and darkreader_state["colorScheme"] == "dark"
            )
            print(f"编辑页 darkreader 策略: {'PASS' if darkreader_pass else 'FAIL'} {darkreader_state}")
            editor_checks.append(darkreader_pass)

            set_editor_policy(page, "disable")
            page.goto(args.base + "/console/dashboard", wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass
            wait_mode(page, expect_dark=True)
            restored_state = read_state(page)
            restored_pass = (
                restored_state["editorPolicy"] == "disable"
                and restored_state["editorStored"] == "disable"
                and restored_state["editorScope"] is None
                and restored_state["darkreader"] == "dynamic"
                and restored_state["colorScheme"] == "dark"
            )
            print(f"离开编辑页恢复普通页: {'PASS' if restored_pass else 'FAIL'} {restored_state}")
            editor_checks.append(restored_pass)

        editor_pass = all(editor_checks) if editor_checks else True

        ctx.close()
        return (
            0
            if toggle_absent
            and attr_flipped
            and stored_flipped
            and darkreader_flipped
            and scheme_flipped
            and editor_pass
            else 1
        )


if __name__ == "__main__":
    sys.exit(main())
