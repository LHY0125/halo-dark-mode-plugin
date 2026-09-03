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

部署新版插件后运行，会直接驱动 localStorage 中的主题状态，并检查：

- `data-halo-theme` 属性翻转
- localStorage 持久化翻转
- `data-darkreader-mode`（Dark Reader 注入状态）翻转
- `color-scheme` 翻转
- 侧边栏已不再注入 `.theme-toggle` / `.plugin-dark-mode-toggle` 按钮

状态翻转全部 PASS 且按钮已移除时返回 0。

脚本默认还会进入 `/console/posts/editor` 验证编辑页两种策略：

- `disable`：Dark Reader 仍处理整页，文章编辑工作区局部使用浅色纸面；`data-halo-editor-scope` 为 `post-editor`，根节点 `color-scheme` 为 `dark`
- `darkreader`：编辑页和编辑工作区完全跟随 Dark Reader，根节点 `color-scheme` 为 `dark`
- 离开编辑页后：恢复普通页面的深色状态

如果暂时只想验证普通 Dashboard，可加 `--skip-editor`；如果文章编辑器路径
需要文章名称，可用 `--editor-url "/console/posts/editor?name=..."` 覆盖默认路径。

## 编辑页真实样式验证

`verify-toggle.py` 主要验证主题状态、存储值和路由范围属性；它不会判断页面最终的背景色。
要验证编辑页的实际计算样式，请使用：

```powershell
# 验证当前截图对应的「编辑页也使用 Dark Reader」策略
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\verify-editor-visual.py --policy darkreader --editor-url "/console/posts/editor?name=..."

# 验证「编辑页使用浅色纸面」策略
D:\settings\settings\uv\my_uv_env\Scripts\python.exe scripts\verify-editor-visual.py --policy disable --editor-url "/console/posts/editor?name=..."
```

脚本通过 `getComputedStyle()` 读取并保存以下区域的背景色、文字色和 `color-scheme`：

- `aside.sidebar` 左侧导航
- `.halo-rich-text-editor` 编辑器根容器
- `.editor-header` 工具栏
- `.editor-entry`、`.editor-main`、`.editor-main-content` 工作区
- `.ProseMirror` 正文区域
- `.editor-entry-extra` 右侧辅助区域
- `.ProseMirror pre` 代码块（页面存在时）

输出保存到 `scripts/output/editor-visual.json` 和 `scripts/output/editor-visual.png`，目录已被
`.gitignore` 忽略。`darkreader` 策略预期编辑器主体为深色，原始样式保护的代码块可以保留浅色；
`disable` 策略预期编辑器工作区为浅色。两种策略都要求左侧导航保持深色。`data-darkreader-mode`
的真实值必须通过真实浏览器读取，不能由 Dark Reader 的单元测试 mock 推断。

## 纯检查质量门

当前 `pnpm lint` 命令保留项目原有的自动修复行为。发布或审查前请使用不改文件的检查：

```powershell
cd ui
.\node_modules\.bin\vue-tsc.CMD --build
.\node_modules\.bin\vitest.CMD run
pnpm lint:check
```

`scripts/release.sh` 只接受干净工作区，默认执行本地构建和 JAR 内容校验；`--commit`、
`--tag`、`--release` 都必须显式传入，脚本拒绝 `--push`。

## 输出

- `scripts/output/scan-results.json`：按路由分组的结果
- `scripts/output/shots/*.png`：每页截图
- 均已被 gitignore，不入库。

## 注意事项

- 扫描会忽略 `img/canvas/video/svg/iframe`，避免把文章图片、编辑器画布等内容性
  元素误判为界面残留。
- 路由从 Vue Router 动态发现，Halo 或插件升级新增页面后无需维护清单。
- `scan-dark.py` 主要为历史手工 CSS 工作流保留；当前暗色转换由 Dark Reader 负责，
  运行时状态验证以 `verify-toggle.py` 为准，编辑页最终颜色以 `verify-editor-visual.py` 为准。
