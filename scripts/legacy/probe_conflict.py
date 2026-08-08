# 冲突溯源：找出与插件暗色规则竞争的原生规则及其样式表加载顺序
import pathlib
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
PROFILE = ROOT / "pw-profile"

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        str(PROFILE), channel="msedge", headless=True
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto("https://blog.liuhangyv.top/console/overview", wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    time.sleep(3)
    result = page.evaluate(
        """() => {
          const targets = ['description-item__label', 'menu-item-title', 'empty-title', 'alert-wrapper'];
          const out = [];
          const sheets = [...document.styleSheets];
          sheets.forEach((sheet, si) => {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { return; }
            for (const r of rules) {
              const sel = r.selectorText || '';
              if (sel.includes('data-halo-theme')) continue;
              for (const t of targets) {
                if (sel.includes(t)) {
                  out.push({ sheetIndex: si, href: (sheet.href || '(inline)').slice(-60), selector: sel.slice(0, 120), body: r.style.cssText.slice(0, 120) });
                }
              }
            }
          });
          // 插件 bundle.css 的位置
          const pluginIdx = sheets.findIndex(s => s.href && s.href.includes('bundle.css'));
          return { pluginIdx, totalSheets: sheets.length, matches: out };
        }"""
    )
    ctx.close()

print(f"插件 bundle.css 样式表序号: {result['pluginIdx']} / 共 {result['totalSheets']} 个")
for m in result["matches"]:
    print(f"[sheet #{m['sheetIndex']:>2}] {m['selector']}")
    print(f"            {m['body']}  <- {m['href']}")
