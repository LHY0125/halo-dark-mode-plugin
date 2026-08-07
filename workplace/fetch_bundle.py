# 抓取服务端实际部署的插件 bundle.css，与本地构建产物对比
import pathlib
import re
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
PROFILE = ROOT / "pw-profile"
OUT = ROOT / "deployed-bundle.css"

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        str(PROFILE), channel="msedge", headless=True
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto("https://blog.liuhangyv.top/console/overview", wait_until="domcontentloaded")
    time.sleep(4)
    text = page.evaluate(
        """async () => {
          const sheet = [...document.styleSheets].find(s => s.href && s.href.includes('bundle.css'));
          if (!sheet) return null;
          return await (await fetch(sheet.href)).text();
        }"""
    )
    ctx.close()

if not text:
    print("未找到 bundle.css")
    raise SystemExit(1)

OUT.write_text(text, encoding="utf-8")
local = (ROOT.parent / "ui" / "build" / "dist" / "style.css").read_text(encoding="utf-8")


def dark_selectors(css: str) -> set:
    # 提取所有 [data-halo-theme=dark] 规则的选择器（粗略切分）
    return set(re.findall(r"(\[data-halo-theme=dark\][^{]+)\{", css))


dep = dark_selectors(text)
loc = dark_selectors(local)
print(f"部署版 dark 规则选择器数: {len(dep)}")
print(f"本地构建 dark 规则选择器数: {len(loc)}")
print(f"本地有而部署没有（未部署的新覆盖）: {len(loc - dep)}")
for s in sorted(loc - dep)[:40]:
    print("  +", s[:110])
print(f"部署有而本地没有（本地已删除的旧规则）: {len(dep - loc)}")
for s in sorted(dep - loc)[:40]:
    print("  -", s[:110])

for kw in ["description-item__label", "description-item__content", "empty-title",
           "menu-item-title", "alert-wrapper"]:
    print(f"关键字 {kw!r}: 部署版={'有' if kw in text else '无'}  本地={'有' if kw in local else '无'}")
