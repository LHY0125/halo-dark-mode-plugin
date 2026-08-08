"""验证侧边栏主题切换：点击后检查 data-halo-theme、localStorage 与 Monaco 主题同步。

部署新版插件后运行可获得完整结果；预部署阶段 Monaco 断言会提示跳过。
"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
BASE = "https://blog.liuhangyv.top"


def main() -> int:
    parser = argparse.ArgumentParser(description="验证主题切换运行时行为")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
    args = parser.parse_args()

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            args.profile, channel="msedge", headless=True,
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
        before = page.evaluate("() => ({ attr: document.documentElement.getAttribute('data-halo-theme'), stored: localStorage.getItem('halo-dark-mode-theme') })")
        toggle.click()
        time.sleep(0.5)
        after = page.evaluate("() => ({ attr: document.documentElement.getAttribute('data-halo-theme'), stored: localStorage.getItem('halo-dark-mode-theme') })")
        toggle.click()
        time.sleep(0.5)
        restored = page.evaluate("() => ({ attr: document.documentElement.getAttribute('data-halo-theme'), stored: localStorage.getItem('halo-dark-mode-theme') })")

        attr_flipped = before["attr"] != after["attr"] and before["attr"] == restored["attr"]
        stored_flipped = before["stored"] != after["stored"] and before["stored"] == restored["stored"]
        print(f"初始: {before}")
        print(f"切换: {after}")
        print(f"还原: {restored}")
        print(f"属性翻转: {'PASS' if attr_flipped else 'FAIL'}  存储翻转: {'PASS' if stored_flipped else 'FAIL'}")

        page.goto(args.base + "/console/log-viewer", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=6000)
        except Exception:
            pass
        time.sleep(2)
        has_monaco = page.locator(".monaco-editor").count() > 0
        if has_monaco:
            dark_attr = page.evaluate("document.documentElement.getAttribute('data-halo-theme')") == "dark"
            theme_cls = page.evaluate("() => { const el = document.querySelector('.monaco-editor'); return el ? el.className : '' }")
            monaco_dark = "vs-dark" in theme_cls
            print(f"Monaco 实例: 存在 | 属性dark={dark_attr} | 主题类含vs-dark={monaco_dark} | class={theme_cls[:60]}")
            print(f"Monaco 主题同步: {'PASS' if (dark_attr and monaco_dark) or (not dark_attr and not monaco_dark) else 'FAIL（可能部署的还是旧版 JS）'}")
        else:
            print("Monaco 实例: 未检测到，跳过主题断言（日志页面可能未加载或路由不同）")
        ctx.close()
        return 0 if attr_flipped and stored_flipped else 1


if __name__ == "__main__":
    sys.exit(main())