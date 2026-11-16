# 电源开关

会话头部那排图标（含「展开底部面板」）的最右边，紧挨着 `…` 前面，一个电源图标。点开是标准的 DSH 菜单样子，三项：

- **最小化**：把 DeepSeek Harness 窗口最小化到任务栏。
- **重启**：让应用走自己的退出流程退出，等在后台的拉起脚本确认进程全没了，再把可执行文件重新拉起来。
- **关闭（彻底退出）**：真退出——存盘、关后端、清托盘图标。

## 位置与样式

挂在 `conversation.session.header.utilities` 槽位，order 1000，排在那排图标的末尾（`…` 和右侧栏开关是头部自己画的，排在槽位之后）。这排只在会话页出现——新会话页和设置页没有它。

按钮 28×28、圆角 8、颜色 `--dsw-alias-label-secondary`、图标 16px，和同排的「更多操作」一致；菜单照搬它的样式：`padding: 4px`、行高 34px、`--dsw-radius-lg` 面板、`--dsw-elevation-prominent` 阴影、行圆角 `--dsw-radius-md`，文字 13px。

菜单用 `createPortal` 挂到 `document.body` 上、`position: fixed` 贴着按钮下方展开，因为头部那排图标所在的容器对溢出做了裁剪。

## 怎么做的

页面半侧不碰系统，只往宿主发一条 POST；宿主半侧调 Windows PowerShell 脚本 `scripts/power.ps1`，用 `user32.dll` 的窗口消息操作 Electron 窗口：

| 动作 | 做法 |
| --- | --- |
| 最小化 | `ShowWindow(SW_MINIMIZE)` |
| 关闭 | 先发 `WM_ENDSESSION`（让应用认为系统在注销，于是关闭时不再 preventDefault 藏托盘），再发 `WM_CLOSE`；12 秒没退就 `taskkill` 兜底 |
| 重启 | 先起一个独立的拉起脚本（等所有 `DeepSeek Harness` 进程消失再启动，最多等 120 秒），再走上面那条退出流程 |

拉起脚本不靠单个 PID——0.1.2 就是等 PID 判断失效，退出还没完成就提前把 exe 拉起来，撞上单实例锁，于是只关不开。现在改成按进程名判断；启动时优先走开始菜单快捷方式（这样进程带着 `electron.app.DeepSeek Harness` 这个 AppUserModelID，任务栏不会多出一个空白图标），没有快捷方式才直接启动 exe。

每次动作都往 `~/.dsh/dsh-power.log` 记一行，退出走的是优雅流程还是强杀、拉起脚本有没有真的启动 exe，都看这个文件。

## 边界

- 只对 Windows 上的桌面版（Electron 窗口）有用。在浏览器标签里点，操作的是那扇应用窗口。
- 改了页面半侧之后要刷新一次页面（桌面版重启一次应用）才会换成新代码。
- 重启 / 关闭会中断正在跑的回合；会话本身已落盘，重新打开还在。
