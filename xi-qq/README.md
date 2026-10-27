# dsh-xi-qq

汐的 QQ 通道。宿主半侧插件，没有界面。

```
QQ 客户端 ←→ NapCat(OneBot 11) ←→ 本插件 ←→ DSH 会话 ←→ 汐
```

## 它做什么

- 收 QQ 私聊 / 群里 @ 的消息（OneBot 11 反向 WS）
- 每个对端（私聊某人 / 某个群）对应一个 DSH 会话，上下文一直在
- 发言走工具（`qq_send_message` 等），不是把文字自动转出去——见「工具模式」
- 同一个对端串行处理，消息不会互相插队
- 断线自动重连（1s → 2s → 4s → 8s → 16s → 30s 封顶）

## 依赖

- 一个 OneBot 11 协议端，推荐 [NapCat](https://github.com/NapNeko/NapCatQQ)，本插件连它的 **WebSocket 服务端**（默认 `ws://127.0.0.1:3001`）。
- Electron 44 / Node 22 自带的 `WebSocket`，不需要装任何 npm 包。

## 配置

`~/.dsh/xi-qq/settings.json`，改完 2 秒内生效。缺省值见 `lib/settings.js`；`dsh-xi` 控制台「接入 → QQ → 白名单」写的就是这里。

**白名单默认拒绝**：`allowUsers` / `groups` 里没有的对端一律不回（不建会话、不花算力），只记进 `rejected.json`，控制台里显示成可一键加入的虚线圈。

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `wsUrl` | `ws://127.0.0.1:3001` | NapCat WebSocket 服务端地址 |
| `accessToken` | `""` | NapCat 的 token，有就填 |
| `selfId` | `""` | 机器人 QQ 号，空则用事件里的 `self_id` |
| `allowUsers` | `[]` | 私聊白名单（QQ 号）；空 = 谁都不回 |
| `groups` | `[]` | 群白名单（群号）；空 = 群里一律不回 |
| `cwd` | `""` | 会话工作目录；空 = DSH 默认工作区（会带上 `~/.dsh/AGENTS.md` 的人设与记忆规则） |
| `agentPreset` | `""` | 指定 agent preset，空 = 默认 |
| `timeoutMs` | `180000` | 一轮最多等多久 |
| `maxReplyChars` | `1500` | 单条最大字数，超出分条 |
| `selftest` | `false` | 启动时不经过 QQ 直接问模型一句，结果写 `qq.log` |
| `autostartNapCat` | `false` | 交给 `dsh-xi` 控制台管；这里只存着，方便状态展示 |
| `privateChat` | `{enabled:true, minIntervalSec:0, maxPerHour:0}` | 私聊开关与频率，0 = 不限 |
| `groupPolicy.enabled` | `true` | 群聊总开关（群号还要在 `groups` 白名单里） |
| `groupPolicy.mention` | `{enabled:true, minIntervalSec:15, maxPerHour:30}` | 被 @ 时回复的频率 |
| `groupPolicy.ambient` | `{enabled:false, trigger:'keywords', minIntervalSec:600, maxPerHour:3, chance:0.5, keywords:[...]}` | 没被 @ 时主动接话：触发 → 冷却 → 上限 → 掷骰子，四道闸。`trigger:'any'` = 群里任何一句都算触发（纯表情/单字除外），`'keywords'` = 只认关键词或问句 |
| `limits` | `{dailyEnabled:true, dailyReplies:200}` | 全通道每日总条数，过零点重置 |
| `chat` | `{chunkReply:true, maxChunks:3, typing:true, styleNote:true, styleNoteText:''}` | 分条发、显示正在输入、会话开头那句说话风格（`styleNoteText` 留空用内置文案） |
| `scene` | `{enabled:true, maxMessages:20, maxChars:800}` | 群聊近况：开口时把最近几条挂进提示词。关掉就退回正文里 6 行摘要 |
| `tools` | `{enabled:true, fallbackOnSilent:true, minIntervalSec:2, maxPerHour:60}` | 工具模式：发言走 `qq_*` 工具；`enabled:false` 退回「文字自动转发」；`fallbackOnSilent:false` = 没调工具就真的一个字都不发 |
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

## 群聊近况（scene）

白名单里的**每一条**消息都会落进转录（`~/.dsh/xi-qq/transcripts/group_<群号>.jsonl`，一个对端一个文件，2MB 轮转、只留最近 400 行），不管有没有点名她。

她开口时，这段近况会以 **agent 作用域**挂进那一轮提示词：`systemPrompt.context({ name: 'qq-scene' })`，只对那个 QQ 会话生效——阿晚在网页里跟我说话时，提示词里不会有任何 QQ 内容。默认最近 20 条、总量 800 字，正在回的那条会跳过，免得和正文重复。

为什么不做「全程监听」：DSH 没有「只写上下文不跑模型」的接口，`prompt` 一定驱动一轮。真要做到每条都进模型，就得每条烧一轮——那是钱买来的在场，不值。

挂不上的情况（拿不到 `systemPrompt`、注册冲突）会自动退回老的 6 行摘要，只留一行 `scene: ... 退回正文摘要` 的日志。

**成本**：每个触发轮多 300~500 token，和砍掉的 6 行摘要基本抵平。想更省，把 `maxMessages` 调到 10、`maxChars` 到 400。

## 工具模式（0.5.0）

以前是「这一轮输出的文字自动发到 QQ」。0.5.0 起换成工具：给她一组 `qq_*` 工具，
**发言必须调 `qq_send_message`**，文字输出只是思考，不发出去。

| 工具 | 干什么 |
| --- | --- |
| `qq_send_message` | 发一条。自动去 markdown、按句分条、过限速 |
| `qq_send_burst` | 一次发多条，每条一个气泡（最多 5 条） |
| `qq_get_recent_messages` | 回看最近说过什么 |
| `qq_wait_for_messages` | 等对方接着说（最多 5 分钟）。等待期间到的消息由工具收下，**不另开一轮**，所以不会回两次 |
| `qq_close_conversation` | 记一句「收在哪、下次怎么接」，下一轮提示词开头带上 |

为什么换：自动转发时出站消息没法逐条拦截；换成工具后，「想说什么」和「真的发了」之间多了一个闸门。
发送口只有一个（`tools.js` 的 `deliver()`），每日总量、每会话冷却、每小时上限、分条，都在那一处。

**三个安全阀**：

1. 工具只挂在 QQ 会话的 agent 上（`agent.ctx.tools.register`），网页里的会话看不见它们——和 `scene` 一样是 agent 作用域。
2. 挂不上工具（拿不到 `tools` 服务、注册抛错）就自动退回**老的自动转发**，只留一行日志，不会把话吞掉。
3. `tools.fallbackOnSilent` 默认 `true`：模型没调工具却写了文字时补发，`qq.log` 里留一行 `silent-turn`。
   **等连续几天日志里没有 `silent-turn`，再把它设成 `false`** —— 那才是真正的「说了才算」。

**成本**：每轮多一份工具清单（约 300 token），但省掉「不发言也要把整段话输出一遍」的浪费，大致抵平。

**排错**：`qq.log` 里看 `tools: 已挂` / `tools: 退回自动转发` / `tool send` / `silent-turn` 四种行，比看 QQ 准。

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

## 群里没反应怎么查

按顺序看 `qq.log`：

1. 什么都没有 → 消息没到桥。看 NapCat 是否在线、`wsUrl` 端口对不对。
2. `group 123456 不在 groups 白名单` → 控制台「接入 → QQ → 白名单」把群号加进去，或者写 `settings.json` 的 `groups`，2 秒生效。
3. `@ 限流（cooldown/hourly）` / `插话限流` → 撞上频率限制，等冷却或调大上限。
4. `插话掷骰子没过` → 概率没中，属正常。
5. `send failed` → 协议端拒发，常见是账号被禁言或群号错。

## 限制

- 只处理文字；图片/语音/表情只留占位符 `[图片]`，不做识别
- **工具模式下，模型可能忘记调工具**：日志里出现 `silent-turn` 就是这个。`fallbackOnSilent` 先兜着，真调顺了再关
- **不在场的时间她自己补不回来**：没触发时不会跑模型，只在开口那一刻看到最近 20 条；更早的要翻转录文件
- 不做流式，等整轮结束后一次发出
- 依赖本机 DSH 常驻运行；DSH 关掉或电脑休眠时就收不到消息
- 第三方协议端有账号风险，用小号更稳妥
