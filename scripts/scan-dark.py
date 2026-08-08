"""Halo 后台暗色模式残留扫描器（正式回归工具）。

用法示例：
  python scripts/scan-dark.py --local-css ui/build/dist/style.css --assert-zero
  python scripts/scan-dark.py --mode light --pages /console/posts,/console/users
  python scripts/scan-dark.py --profile workplace/pw-profile
"""
import argparse
import json
import pathlib
import re
import sys
import time

from playwright.sync_api import sync_playwright

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "https://blog.liuhangyv.top"
DEFAULT_PROFILE = pathlib.Path(__file__).parent / ".browser-profile"
DEFAULT_OUTPUT = pathlib.Path(__file__).parent / "output"

SCAN_JS = r"""
() => {
  const EXCLUDED_TAGS = new Set(['IMG', 'CANVAS', 'VIDEO', 'SVG', 'IFRAME']);
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
    if (EXCLUDED_TAGS.has(el.tagName)) return;
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
    const c = cs.color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (hasText && c && (+c[4] ?? 1) > 0.05 && (+c[1] + +c[2] + +c[3]) / 3 < 95) {
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
    parser = argparse.ArgumentParser(description="Halo 后台暗色模式残留扫描")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--profile", default=str(DEFAULT_PROFILE))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--mode", choices=["dark", "light"], default="dark")
    parser.add_argument("--pages", default="", help="逗号分隔的路由子集，默认扫描全部")
    parser.add_argument("--local-css", default="", help="注入本地构建的 style.css 做预部署验证")
    parser.add_argument("--assert-zero", action="store_true", help="存在残留时以退出码 1 结束")
    args = parser.parse_args()

    output = pathlib.Path(args.output_dir)
    shots = output / "shots"
    shots.mkdir(parents=True, exist_ok=True)

    if args.mode == "dark":
        init_js = """
        try { localStorage.setItem('halo-dark-mode-theme', 'dark'); } catch (e) {}
        document.documentElement.setAttribute('data-halo-theme', 'dark');
        """
    else:
        init_js = """
        try { localStorage.setItem('halo-dark-mode-theme', 'light'); } catch (e) {}
        document.documentElement.removeAttribute('data-halo-theme');
        """

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            args.profile,
            channel="msedge",
            headless=True,
            viewport={"width": 1600, "height": 950},
        )
        ctx.add_init_script(init_js)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(args.base + "/console/dashboard", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        try:
            page.wait_for_selector("#app > *, .sidebar, .main-content", timeout=20000)
        except Exception:
            pass
        time.sleep(2)
        if "/login" in page.url:
            print("SESSION_EXPIRED 登录态失效，请先运行 scripts/login-wait.py 登录")
            ctx.close()
            return 3

        routes = []
        try:
            routes = page.evaluate(
                """() => {
                  const app = document.querySelector('#app').__vue_app__;
                  const router = app.config.globalProperties.$router;
                  return router.getRoutes().map(r => r.path);
                }"""
            )
        except Exception:
            routes = page.evaluate(
                """() => [...new Set([...document.querySelectorAll('a[href]')]
                    .map(a => a.getAttribute('href'))
                    .filter(h => h && h.startsWith('/console')))]"""
            )
        routes = sorted(
            {
                r if r.startswith("/console") else "/console" + r
                for r in routes
                if r.startswith("/") and ":" not in r and r not in ("/", "/console")
            }
        )
        editor = [r for r in routes if "editor" in r]
        routes = [r for r in routes if "editor" not in r] + editor[:1]
        if args.pages:
            wanted = [r.strip() for r in args.pages.split(",") if r.strip()]
            routes = [r for r in wanted if r.startswith("/console")]

        print(f"模式={args.mode}  待扫描路由数={len(routes)}", flush=True)
        all_results = {}
        for route in routes:
            try:
                last_error = None
                for attempt in range(3):
                    try:
                        page.goto(args.base + route, wait_until="domcontentloaded")
                        last_error = None
                        break
                    except Exception as e:
                        last_error = e
                        print(f"{route}: 第 {attempt + 1} 次导航失败，稍后重试", flush=True)
                        time.sleep(8)
                if last_error:
                    raise last_error

                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                # 限流时 Halo bundle 可能加载较慢，确保应用渲染完成再扫描
                page.wait_for_selector("#app > *, .sidebar, .main-content", timeout=20000)
                if args.local_css:
                    page.add_style_tag(path=args.local_css)
                time.sleep(2)
                if args.mode == "dark":
                    page.evaluate("document.documentElement.setAttribute('data-halo-theme','dark')")
                else:
                    page.evaluate("document.documentElement.removeAttribute('data-halo-theme')")
                time.sleep(0.3)
                items = page.evaluate(SCAN_JS)
                all_results[route] = items
                page.screenshot(path=str(shots / (slug(route) + ".png")))
                print(f"{route}: {len(items)} 处疑似残留", flush=True)
            except Exception as e:
                all_results[route] = {"error": str(e)[:200]}
                print(f"{route}: 扫描失败 {e}", flush=True)

        out_json = output / "scan-results.json"
        out_json.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")
        ctx.close()

        total = sum(
            len(v) for v in all_results.values() if isinstance(v, list)
        )
        dirty = sum(1 for v in all_results.values() if isinstance(v, list) and v)
        print(f"DONE 残留条目={total} 残留路由={dirty} 结果文件={out_json}", flush=True)
        if args.assert_zero and dirty:
            return 1
        return 0


if __name__ == "__main__":
    sys.exit(main())