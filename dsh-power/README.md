# dsh-power

DeepSeek Harness 插件的电源开关：会话头部那排图标的最右边一个电源按钮，最小化 / 重启 / 关闭（彻底退出）。

- 宿主半侧 `lib/index.js` 注册 `/api/dsh-power/{minimize,quit,restart}`，调 `scripts/power.ps1`。
- 页面半侧 `client.js` 挂进 `conversation.session.header.utilities`，菜单用 portal 贴按钮下方展开。
- 实现说明、位置原因、验证状态和边界见 [docs/DETAIL.md](docs/DETAIL.md)。
