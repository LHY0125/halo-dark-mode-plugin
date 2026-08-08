# 暗色模式回归扫描与运行时验证工具

用 Playwright 驱动 Edge 对 Halo 后台做全路由深浅色残留扫描与运行时切换验证。

## 依赖

- Python 3.13 环境（本机：`D:\settings\settings\uv\my_uv_env`）
- Playwright（已安装）：`pip install playwright` 或 `uv pip install playwright`
- 本机 Edge（Playwright 通过 `channel="msedge"` 复用，无需下载浏览器内核）

## 首次使用：登录

```powershell
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\login-wait.py
```

会弹出 Edge 窗口，登录 `https://blog.liuhangyv.top/console` 后脚本自动退出，
会话保存在 `scripts/.browser-profile/`（已被 gitignore，不会入库）。

已有登录态想复用，可显式指定 profile：

```powershell
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --profile scripts\.browser-profile
```

## 常用命令

```powershell
# 全路由深色扫描（历史 CSS 工作流保留）
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --local-css ui\build\dist\style.css --assert-zero

# 只扫指定页面
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --pages /console/posts,/console/users

# 浅色模式回归抽查
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --mode light --pages /console/dashboard,/console/posts
```

## 切换行为验证

```powershell
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\verify-toggle.py
```

部署新版插件后运行，会检查：

- `data-halo-theme` 属性翻转
- localStorage 持久化翻转
- `data-darkreader-mode`（Dark Reader 注入状态）翻转

三项全部 PASS 时返回 0。

## 输出

- `scripts/output/scan-results.json`：按路由分组的结果
- `scripts/output/shots/*.png`：每页截图
- 均已被 gitignore，不入库。

## 注意事项

- 扫描会忽略 `img/canvas/video/svg/iframe`，避免把文章图片、编辑器画布等内容性
  元素误判为界面残留。
- 路由从 Vue Router 动态发现，Halo 或插件升级新增页面后无需维护清单。
- `scan-dark.py` 主要为历史手工 CSS 工作流保留；当前暗色转换由 Dark Reader 负责，
  运行时行为验证以 `verify-toggle.py` 为准。