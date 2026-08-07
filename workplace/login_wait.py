# 启动带持久化配置的 Edge 窗口，等待用户登录 Halo 后台。
# 登录成功后脚本自动退出，会话会保留在 pw-profile 目录里供后续扫描使用。
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

PROFILE = pathlib.Path(__file__).parent / "pw-profile"
LOGIN_URL = "https://blog.liuhangyv.top/console/login"
TIMEOUT_S = 280


def main() -> int:
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFILE),
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
                time.sleep(3)  # 等待会话 cookie 写入磁盘
                print(f"检测到登录成功: {url}", flush=True)
                ctx.close()
                return 0
            time.sleep(2)

        print("等待超时，未检测到登录", flush=True)
        ctx.close()
        return 1


if __name__ == "__main__":
    sys.exit(main())
