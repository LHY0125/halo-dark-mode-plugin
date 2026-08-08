"""验证主题切换：直接驱动 localStorage，检查 data-halo-theme、Dark Reader 与 color-scheme 翻转。"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
BASE = "https://blog.liuhangyv.top"
STORAGE_KEY = "halo-dark-mode-theme"


def read_state(page) -> dict:
    return page.evaluate(
        """() => ({
            attr: document.documentElement.getAttribute('data-halo-theme'),
            darkreader: document.documentElement.getAttribute('data-darkreader-mode'),
            stored: localStorage.getItem('halo-dark-mode-theme'),
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


def main() -> int:
    parser = argparse.ArgumentParser(description="验证主题切换运行时行为")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
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

        ctx.close()
        return (
            0
            if toggle_absent
            and attr_flipped
            and stored_flipped
            and darkreader_flipped
            and scheme_flipped
            else 1
        )


if __name__ == "__main__":
    sys.exit(main())