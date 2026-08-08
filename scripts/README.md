# 暗色模式回归扫描工具

用 Playwright 驱动 Edge 对 Halo 后台做全路由深浅色残留扫描，验证每次 CSS 改动。

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
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --profile workplace\pw-profile
```

## 常用命令

```powershell
# 全路由深色扫描，注入本地构建产物做预部署验证，存在残留时返回非 0
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --local-css ui\build\dist\style.css --assert-zero

# 只扫指定页面
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --pages /console/posts,/console/users

# 浅色模式回归抽查
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\scan-dark.py --mode light --pages /console/dashboard,/console/posts
```

## 输出

- `scripts/output/scan-results.json`：按路由分组的结果
- `scripts/output/shots/*.png`：每页截图
- 均已被 gitignore，不入库。

## 切换行为验证

```powershell
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\verify-toggle.py
```

部署新版插件后运行，会检查侧边栏按钮切换、`data-halo-theme` 属性、
localStorage 持久化以及 Monaco 日志查看器主题是否同步。

## 注意事项

- 扫描会忽略 `img/canvas/video/svg/iframe`，避免把文章图片、编辑器画布等内容性
  元素误判为界面残留。
- 路由从 Vue Router 动态发现，Halo 或插件升级新增页面后无需维护清单。
- `--local-css` 用 `add_style_tag` 追加本地样式（不替换线上 bundle），可安全验证
  CSS 修复；JS 改动（如 Monaco 主题同步）需要重新构建并部署后再跑 `verify-toggle.py`。