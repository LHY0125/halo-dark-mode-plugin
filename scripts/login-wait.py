"""打开带持久化配置的 Edge 窗口，等待用户在 Halo 后台完成登录。

登录成功后会话保存在 profile 目录，供 scan-dark.py 复用。
"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
LOGIN_URL = "https://blog.liuhangyv.top/console/login"
TIMEOUT_S = 280


def main() -> int:
    parser = argparse.ArgumentParser(description="登录 Halo 后台并保存会话")
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
    args = parser.parse_args()

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            args.profile,
            channel="msedge",
            headless=False,
            viewport={"width": 1600, "height": 950},
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(LOGIN_URL)
        print("浏览器窗口已打开，请在其中登录 Halo 后台...", flush=True)

        deadline = time.time() + TIMEOUT_S
        while time.time() < deadline:
            try:
                url = page.url
            except Exception:
                print("检测到窗口被关闭", flush=True)
                return 2
            if "/console" in url and "/login" not in url:
                time.sleep(3)
                print(f"检测到登录成功: {url}", flush=True)
                ctx.close()
                return 0
            time.sleep(2)

        print("等待超时，未检测到登录", flush=True)
        ctx.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())