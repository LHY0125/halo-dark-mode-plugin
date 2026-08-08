"""验证侧边栏主题切换：点击后检查 data-halo-theme、localStorage 与 Dark Reader 模式。"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
BASE = "https://blog.liuhangyv.top"


def read_state(page) -> dict:
    return page.evaluate(
        """() => ({
            attr: document.documentElement.getAttribute('data-halo-theme'),
            darkreader: document.documentElement.getAttribute('data-darkreader-mode'),
            stored: localStorage.getItem('halo-dark-mode-theme'),
        })"""
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

        toggle = page.locator(".theme-toggle")
        toggle.wait_for(state="visible", timeout=15000)
        before = read_state(page)
        toggle.click()
        time.sleep(1)
        after = read_state(page)
        toggle.click()
        time.sleep(1)
        restored = read_state(page)

        attr_flipped = before["attr"] != after["attr"] and before["attr"] == restored["attr"]
        stored_flipped = before["stored"] != after["stored"] and before["stored"] == restored["stored"]
        darkreader_flipped = (
            before["darkreader"] != after["darkreader"]
            and before["darkreader"] == restored["darkreader"]
        )
        print(f"初始: {before}")
        print(f"切换: {after}")
        print(f"还原: {restored}")
        print(
            f"属性翻转: {'PASS' if attr_flipped else 'FAIL'}  "
            f"存储翻转: {'PASS' if stored_flipped else 'FAIL'}  "
            f"Dark Reader 翻转: {'PASS' if darkreader_flipped else 'FAIL'}"
        )

        ctx.close()
        return 0 if attr_flipped and stored_flipped and darkreader_flipped else 1


if __name__ == "__main__":
    sys.exit(main())