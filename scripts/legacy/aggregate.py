# 聚合扫描结果：按 (元素, 类名, 问题) 分组，统计影响页面数
import json
import pathlib
from collections import defaultdict

data = json.loads(
    (pathlib.Path(__file__).parent / "scan-results.json").read_text(encoding="utf-8")
)

groups = defaultdict(lambda: {"pages": [], "sample": None})
for route, items in data.items():
    if route.startswith("__") or isinstance(items, dict):
        continue
    for it in items:
        key = (it["tag"], it["cls"], tuple(it["issues"]))
        groups[key]["pages"].append(route)
        if groups[key]["sample"] is None:
            groups[key]["sample"] = it

# 按影响页面数降序
ranked = sorted(groups.items(), key=lambda kv: -len(kv[1]["pages"]))
for (tag, cls, issues), g in ranked:
    s = g["sample"]
    pages = g["pages"]
    print(f"[{len(pages)}页] <{tag}> .{cls[:80]}")
    print(f"    问题: {', '.join(issues)}")
    print(f"    路径: {s['path'][:130]}")
    print(f"    文本: {s['text'][:40]}  尺寸: {s['size']}")
    print(f"    页面: {', '.join(pages[:12])}{' ...' if len(pages) > 12 else ''}")
    print()
