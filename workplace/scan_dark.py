# Halo 后台暗色模式残留扫描器
# 自动发现侧边栏全部 /console 路由，逐页扫描浅色背景 / 深色文字残留并截图。
import json
import pathlib
import re
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "https://blog.liuhangyv.top"
ROOT = pathlib.Path(__file__).parent
PROFILE = ROOT / "pw-profile"
SHOTS = ROOT / "shots"
OUT = ROOT / "scan-results.json"

# 在每个页面加载前强制插件进入深色模式
INIT_JS = """
try { localStorage.setItem('halo-dark-mode-theme', 'dark'); } catch(e) {}
document.documentElement.setAttribute('data-halo-theme', 'dark');
"""

# 页面内扫描：浅色背景（RGB 均 >235 且不透明）、深色文字（RGB 均 <70）
SCAN_JS = r"""
() => {
  const results = [];
  const seen = new Set();
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
  };
  const shortPath = (el) => {
    const parts = [];
    let cur = el;
    for (let i = 0; i < 5 && cur && cur !== document.body; i++) {
      let p = cur.tagName.toLowerCase();
      if (cur.id) p += '#' + cur.id;
      else if (typeof cur.className === 'string' && cur.className.trim()) {
        p += '.' + cur.className.trim().split(/\s+/).slice(0, 2).join('.');
      }
      parts.unshift(p);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  document.querySelectorAll('body *').forEach(el => {
    if (!isVisible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 20) return;
    const cs = getComputedStyle(el);
    const issues = [];
    const bg = cs.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (bg && bg[4] !== '0' && +bg[1] > 235 && +bg[2] > 235 && +bg[3] > 235) {
      issues.push('light-bg ' + cs.backgroundColor);
    }
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const c = cs.color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (hasText && c && +c[1] < 70 && +c[2] < 70 && +c[3] < 70) {
      issues.push('dark-text ' + cs.color);
    }
    if (!issues.length) return;
    const cls = (typeof el.className === 'string' ? el.className : '').trim().replace(/\s+/g, ' ').slice(0, 150);
    const key = el.tagName + '|' + cls + '|' + issues.join(',');
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      tag: el.tagName.toLowerCase(),
      cls,
      path: shortPath(el),
      issues,
      size: Math.round(r.width) + 'x' + Math.round(r.height),
      text: (el.textContent || '').trim().slice(0, 40),
    });
  });
  return results;
}
"""


def slug(route: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", route.lower()).strip("-") or "root"


def main() -> int:
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFILE),
            channel="msedge",
            headless=True,
            viewport={"width": 1600, "height": 950},
        )
        ctx.add_init_script(INIT_JS)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(BASE + "/console/dashboard", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        time.sleep(3)
        if "/login" in page.url:
            print("SESSION_EXPIRED 登录态失效，需要重新登录", flush=True)
            ctx.close()
            return 3

        dark = page.evaluate("document.documentElement.getAttribute('data-halo-theme')")
        print(f"data-halo-theme = {dark}", flush=True)

        # 普查样式表：确认服务端实际部署的插件 CSS 覆盖了哪些内容
        census = page.evaluate(
            """() => {
              const out = [];
              for (const sheet of document.styleSheets) {
                let rules;
                try { rules = sheet.cssRules; } catch (e) { continue; }
                let darkRules = 0;
                let samples = [];
                for (const r of rules) {
                  const t = r.cssText || '';
                  if (t.includes('data-halo-theme')) {
                    darkRules++;
                    if (samples.length < 3) samples.push(t.slice(0, 100));
                  }
                }
                if (darkRules > 0) {
                  out.push({ href: sheet.href || '(inline)', total: rules.length, darkRules, samples });
                }
              }
              return out;
            }"""
        )
        print("=== 包含暗色规则的样式表 ===", flush=True)
        for c in census:
            print(f"  {c['href']}  dark规则数={c['darkRules']}", flush=True)

        # 关键字探针：确认部署的 CSS 是否包含关键覆盖（判断部署版本新旧）
        keywords = page.evaluate(
            """() => {
              const kws = ['description-item', 'bytemd', 'week-picker', 'menu-item-title',
                           'alert-wrapper', 'entity-field-title', 'sidebar__profile', 'card-wrapper'];
              const found = {};
              for (const kw of kws) found[kw] = false;
              for (const sheet of document.styleSheets) {
                let rules;
                try { rules = sheet.cssRules; } catch (e) { continue; }
                for (const r of rules) {
                  const t = r.cssText || '';
                  if (!t.includes('data-halo-theme')) continue;
                  for (const kw of kws) if (t.includes(kw)) found[kw] = true;
                }
              }
              return found;
            }"""
        )
        print(f"=== 部署 CSS 关键字探针 === {keywords}", flush=True)

        # 从 Vue Router 读取全部已注册路由（含插件注册的菜单页）
        try:
            routes = page.evaluate(
                """() => {
                  const app = document.querySelector('#app').__vue_app__;
                  const router = app.config.globalProperties.$router;
                  return router.getRoutes().map(r => r.path);
                }"""
            )
        except Exception as e:
            print(f"Router 读取失败，回退到锚点抓取: {e}", flush=True)
            routes = page.evaluate(
                """() => [...new Set([...document.querySelectorAll('a[href]')]
                    .map(a => a.getAttribute('href'))
                    .filter(h => h && h.startsWith('/console')))]"""
            )
        # Halo Console 的 router base 是 /console/，getRoutes() 返回的路径不带 base
        routes = sorted(
            {
                r if r.startswith("/console") else "/console" + r
                for r in routes
                if r.startswith("/") and ":" not in r and r not in ("/", "/console")
            }
        )
        # 编辑器路由只保留一个样本，避免重复扫描
        editor = [r for r in routes if "editor" in r]
        routes = [r for r in routes if "editor" not in r] + editor[:1]
        print(f"发现 {len(routes)} 个后台路由: {routes}", flush=True)

        all_results = {}
        all_results["__stylesheet_census__"] = census
        for route in routes:
            try:
                page.goto(BASE + route, wait_until="domcontentloaded")
                try:
                    page.wait_for_load_state("networkidle", timeout=6000)
                except Exception:
                    pass
                time.sleep(1.5)
                # 兜底：再设一次暗色属性，防止插件脚本时序问题
                page.evaluate("document.documentElement.setAttribute('data-halo-theme','dark')")
                time.sleep(0.3)
                items = page.evaluate(SCAN_JS)
                all_results[route] = items
                page.screenshot(path=str(SHOTS / (slug(route) + ".png")))
                print(f"{route}: {len(items)} 处疑似残留", flush=True)
            except Exception as e:  # noqa: BLE001
                all_results[route] = {"error": str(e)[:200]}
                print(f"{route}: 扫描失败 {e}", flush=True)

        OUT.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")
        ctx.close()
        print(f"DONE -> {OUT}", flush=True)
        return 0


if __name__ == "__main__":
    sys.exit(main())
