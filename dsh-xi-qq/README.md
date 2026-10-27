# dsh-xi-qq

汐的 QQ 通道。宿主半侧插件，没有界面。

```
QQ 客户端 ←→ NapCat(OneBot 11) ←→ 本插件 ←→ DSH 会话 ←→ 汐
```

## 它做什么

- 收 QQ 私聊 / 群里 @ 的消息（OneBot 11 反向 WS）
- 每个对端（私聊某人 / 某个群）对应一个 DSH 会话，上下文一直在
- 把会话这轮的文字输出回发到 QQ，自动去 markdown、超长自动分条
- 同一个对端串行处理，消息不会互相插队
- 断线自动重连（1s → 2s → 4s → 8s → 16s → 30s 封顶）

## 依赖

- 一个 OneBot 11 协议端，推荐 [NapCat](https://github.com/NapNeko/NapCatQQ)，本插件连它的 **WebSocket 服务端**（默认 `ws://127.0.0.1:3001`）。
- Electron 44 / Node 22 自带的 `WebSocket`，不需要装任何 npm 包。

## 配置

`~/.dsh/xi-qq/settings.json`，改完重启 DSH 生效。缺省值见 `lib/settings.js`。

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `wsUrl` | `ws://127.0.0.1:3001` | NapCat WebSocket 服务端地址 |
| `accessToken` | `""` | NapCat 的 token，有就填 |
| `selfId` | `""` | 机器人 QQ 号，空则用事件里的 `self_id` |
| `allowUsers` | `[]` | 允许私聊的 QQ 号；空 = 所有私聊都回 |
| `groups` | `[]` | 允许的群号；空 = 群里一律不回 |
| `groupRequireAt` | `true` | 群里必须 @ 才回 |
| `cwd` | `""` | 会话工作目录；空 = DSH 默认工作区（会带上 `~/.dsh/AGENTS.md` 的人设与记忆规则） |
| `agentPreset` | `""` | 指定 agent preset，空 = 默认 |
| `timeoutMs` | `180000` | 一轮最多等多久 |
| `maxReplyChars` | `1500` | 单条最大字数，超出分条 |
| `selftest` | `false` | 启动时不经过 QQ 直接问模型一句，结果写 `qq.log` |
| `autostartNapCat` | `false` | 交给 `dsh-xi` 控制台管；这里只存着，方便状态展示 |
| `privateChat` | `{enabled:true, minIntervalSec:0, maxPerHour:0}` | 私聊开关与频率，0 = 不限 |
| `groupPolicy.enabled` | `true` | 群聊总开关（群号还要在 `groups` 白名单里） |
| `groupPolicy.mention` | `{enabled:true, minIntervalSec:15, maxPerHour:30}` | 被 @ 时回复的频率 |
| `groupPolicy.ambient` | `{enabled:false, minIntervalSec:600, maxPerHour:3, chance:0.5, keywords:[...]}` | 没被 @ 时主动接话：关键词/问句命中 → 冷却 → 上限 → 掷骰子，四道闸 |
| `limits` | `{dailyEnabled:true, dailyReplies:200}` | 全通道每日总条数，过零点重置 |
| `chat` | `{chunkReply:true, maxChunks:3, typing:true, styleNote:true}` | 分条发、显示正在输入、会话开头那句说话风格 |
| `approvalPolicy` | `never` | QQ 会话的审批策略。`never` = 工具要审批就直接拒，不等人；设成 `ask` 会卡死在审批上 |
| `unstickOnStart` | `true` | 插件启动时把已知会话里挂住的回合取消掉 |

**改完不用重启**：插件每 2 秒看一次 `settings.json` 的 mtime，变化就重读配置。
`~/.dsh/xi-qq/status.json` 是插件写给控制台看的运行态（连接、账号、会话数、今日已回条数），每 30 秒心跳一次，连上/断开时也立刻写。

## 限流怎么算

`lib/rate.js` 是内存里的滑动窗口：每个键（`private:QQ号` / `group:群号:mention` / `group:群号:ambient`）一条时间戳队列。

- `minIntervalSec`：距上一条没到就跳过，**不排队**（排队会在事后突然刷屏）。
- `maxPerHour`：一小时窗口内的条数上限。
- `dailyReplies`：所有通道加起来，过零点按本地日期重置；重启清零。

被限流的那条**不会进模型**，所以不花钱，只在 `qq.log` 留一行 `限流（cooldown/hourly/daily）`。

群聊回话时会先垫一段「最近 6 条」摘要（谁说了什么），否则她只看得到被触发的那一句，接不上话。摘要只进 prompt，不进会话历史。

## 看状态

- 日志：`~/.dsh/xi-qq/qq.log`（超过 1MB 自动轮转成 `qq.log.1`）
- 会话映射：`~/.dsh/xi-qq/sessions.json`（对端 → sessionId，删掉即重开会话）

## 自检（没有 QQ 也能验）

把 `selftest` 设为 `true` 重启，`qq.log` 里会出现：

```
selftest: 开始
selftest: kind=completed text="通道通了"
```

有了这一行，说明「会话创建 → prompt → 等 turn/end → 取回复」整条链是通的，剩下只差 QQ 协议端。

## 限制

- 只处理文字；图片/语音/表情只留占位符 `[图片]`，不做识别
- 不做流式，等整轮结束后一次发出
- 依赖本机 DSH 常驻运行；DSH 关掉或电脑休眠时就收不到消息
- 第三方协议端有账号风险，用小号更稳妥
