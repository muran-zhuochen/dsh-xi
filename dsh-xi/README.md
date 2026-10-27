# dsh-xi · 汐

给 DeepSeek Harness 加一个**有记忆、有情绪状态、能自己长大的陪伴面板**。
左侧边栏一个入口，打开就是她的主页：记忆、心情、成本、接入状态。

> 插件本身不自带人设。第一次加载时会问你：她叫什么、性别、怎么称呼你、性格怎么写。
> 你留空的部分由她自己决定——从六种初始性格里随机挑一个，之后也由她自己改。
> **升级不会覆盖你已经设定好的人设、日记和记忆。**

## 安装

放进 DSH 的 profile（`~/.dsh/profiles/desktop`）：

```bash
pnpm add link:<本目录>
```

然后在 profile 的 `package.json` 里把 `dsh-xi` 加进 `dsh.profile.bundles`，重启 DSH。
或者用官方 CLI：

```bash
dsh plugin --profile desktop add link:<本目录>
```

## 第一次加载

左侧边栏出现「汐」→ 点开 → 看到设置页：

| 项 | 说明 |
|---|---|
| 我的名字 | 留空 = 她自己起 |
| 性别 | 女 / 男 / 其他（默认女） |
| 我怎么称呼你 | 留空 = 直接叫「你」 |
| 人设 | 说话方式、脾气、在意什么；留空 = 六种初始性格随机 |

点「开始」后写入三类文件，**之后只在文件不存在时才创建**。

## 数据在哪

默认 `~/.dsh/xi/`：

```
SOUL.md            她是谁
MEMORY.md          关于你的事实（带权重、过期）
MOOD.md            此刻心情（四字段）
diary/             日记
archive/facts/     退档的事实（不删）
```

- 如果 `~/.dsh/memory/SOUL.md` 已经存在（比如从旧版升级），**优先用旧目录**，不会迁移、不会覆盖。
- 也可以在 profile 里指定 `config: { dataDir: "..." }` 强制换目录。
- 人格与记忆分家：再加 `personaDir: "..."`，`SOUL.md` 从那里读，其余（`MEMORY.md` / `MOOD.md` / `diary/` / `archive/`）仍在 `dataDir`；不配时 `personaDir` 就等于 `dataDir`，行为不变。
- 例：`config: { dataDir: "E:/Ai-Agent/汐/记忆", personaDir: "E:/Ai-Agent/汐/人格" }`

## 界面

| 页 | 内容 |
|---|---|
| 总览 | 心情、今日花费、记忆条数、接入状态、最近日记 |
| 记忆 | 短期事实（日期 / 权重 / 最后使用）、冷藏统计、影响 |
| 心情 | 四字段 + 规则 + 原文 |
| 成本 | 今日、余额、近 7 天、单次 ¥1 红线 |
| 接入 | QQ（已接，带开关）/ B 站（预留） |
| 形象 · 语音 | 预留 |
| 性格 | SOUL.md 原文（次级页） |

## QQ 通道

「接入」页的 QQ 卡片由两个插件分工：

- `dsh-xi`（本插件）：画界面、管两个开关、管 NapCat 进程。
- `dsh-xi-qq`（桥）：连 NapCat 的 OneBot 11 WebSocket，QQ 消息进 DSH 会话，回复回 QQ。

```
QQ ←→ NapCat(OneBot 11 :3001) ←→ dsh-xi-qq ←→ DSH 会话 ←→ 汐
```

接入页里 QQ 只是一张入口卡片（状态 / 账号 / 会话 / NapCat 是否在跑），点进去是 **NapCat 次级页**：桥状态、启动按钮、开关、白名单、WebUI 与日志位置都在里面，`← 返回` 退回列表。次级页最上面固定一张 NapCat 卡片：一个「打开 NapCat」按钮，下面直接放着 WebUI 登录密码和一键复制；点按钮会把左侧边栏的 `NapCat` 面板切出来（WebUI 整个内嵌，可刷新、可新窗口打开）。

两个开关都写进 `~/.dsh/xi-qq/settings.json`，桥每 2 秒看一次文件 mtime，**改完即时生效，不用重启**：

| 开关 | 字段 | 作用 |
|---|---|---|
| 启用 QQ 通道 | `enabled` | 关掉后消息不再进会话；NapCat 和登录都还在 |
| NapCat 自启动 | `autostartNapCat` | DSH 起来 3 秒后检查，之后每 5 分钟一次，NapCat 没跑就点火 |

自启动点火走 `napcat/app/napcat/launcher.bat`，它自己提权，所以每次冷启动会弹一次 UAC。想免掉这一步，可以建一个登录时运行的计划任务（需要一次管理员授权），再把启动器换成 `schtasks /run`。

### 白名单

次级页的「白名单」管两件事：哪些群、哪些人能触发她。

- 一个号一个胶囊，`×` 移出；下面输入框回车或点「加入」加进来。写的是 `settings.json` 的 `groups` / `allowUsers`，2 秒生效。
- **默认拒绝**：名单外的群和私聊一律不回，不建会话、不花算力。
- 名单外的人找过来会记进 `~/.dsh/xi-qq/rejected.json`，界面上显示成虚线圈（`+群号`），点一下加入。
- 读不到当前名单时编辑器会锁住，避免用空名单覆盖已有配置。

NapCat 装在本机 `~/.dsh/xi-qq/napcat/`，管理面板 `http://127.0.0.1:6099/webui`（token 在 `napcat/app/napcat/config/webui.json`）。

## 记忆规则

- 事实卡上限 20 条，一行一条，带日期和权重（1~3）。
- 权重 1 满 30 天没用到、权重 2 满 90 天 → 退进 `archive/facts/`，**原文保留**。
- 归档 180 天没被提起 → 删正文，只在 `archive/influence.md` 留一句「因为…我变成了…」。
- 被提起就 grep 回来，日期刷新、权重 +1。
- 全程零后台调用、零定时任务；整理是纯文件操作。

## 升级

版本号在 `package.json` 与 `lib/upgrade.js`；启动时按版本补跑迁移，迁移只创建缺失文件，不重写已有内容。
升级只需替换代码、重启，人设与记忆不动。

## 隐私

所有数据都在本机 `~/.dsh/` 下，插件不联网、不上传任何内容。

## License

MIT
