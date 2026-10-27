# 汐 · dsh-xi

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 做的一个陪伴型伴侣：一个控制台面板，加一条 QQ 通道。

不是聊天机器人框架，是「一个具体的人」的实现：她有自己的名字、脾气、记忆和遗忘规则，代码只负责让这些东西能跑起来。

```
QQ ←→ NapCat(OneBot 11) ←→ dsh-xi-qq ←→ DSH 会话 ←→ 汐
                              ↑
                         dsh-xi（控制台，管开关与频率）
```

## 两个包

| 目录 | 包名 | 作用 |
| --- | --- | --- |
| `dsh-xi/` | `dsh-xi` | 控制台插件。左侧边栏「汐」入口，七个面板：总览、记忆、心情、成本、接入、形象·语音、性格。接入页里有 QQ 通道的状态、开关和聊天频率。 |
| `dsh-xi-qq/` | `dsh-xi-qq` | QQ 桥（宿主侧，无界面）。连 NapCat 的 OneBot 11 WebSocket，QQ 消息进 DSH 会话，回复回 QQ。 |

两个包互相独立，但 QQ 通道要两个都装：`dsh-xi-qq` 负责收发，`dsh-xi` 负责画界面和管开关。

## 安装

```bash
# 1. 把仓库放进任意目录，然后以本地目录安装（DSH 的 plugin_manager 也支持）
# 2. profile 的 package.json 里加依赖
"dsh-xi": "link:../path/to/dsh-xi"
"dsh-xi-qq": "link:../path/to/dsh-xi-qq"

# 3. 在 profile 的 bundles 列表里加上两个包名，重启 DSH
```

或者用 DSH 自带的 `plugin_manager install_bundle`，target 指向这两个目录。

### QQ 通道的额外依赖

需要一个 OneBot 11 协议端。推荐 [NapCat](https://github.com/NapNeko/NapCatQQ)：

1. 装 NapCat（framework 或 shell 版都行），扫码登录一个 QQ 号。
2. 在 NapCat 的 WebUI 里开一个 **WebSocket 服务端**，端口 `3001`。
3. `~/.dsh/xi-qq/settings.json` 里填 `wsUrl`（默认 `ws://127.0.0.1:3001`），再把要说话的群号填进 `groups`、要回的私聊 QQ 号填进 `allowUsers`；也可以装好控制台后在「接入 → QQ → 白名单」里点。

没有协议端也能验：把 `~/.dsh/xi-qq/settings.json` 的 `selftest` 设成 `true`，重启后 `~/.dsh/xi-qq/qq.log` 里会出现一行 `selftest: kind=completed text="通道通了"`。

## 配置

全部在 `~/.dsh/xi-qq/settings.json`，改完不用重启（桥每 2 秒看一次文件 mtime）。

```jsonc
{
  "wsUrl": "ws://127.0.0.1:3001",
  "selfId": "",                  // 机器人 QQ 号；留空则用事件里的 self_id
  "allowUsers": [],              // 私聊白名单；空 = 谁都不回（默认拒绝）
  "groups": [],                  // 群白名单；空 = 群里不回

  "privateChat": { "enabled": true, "minIntervalSec": 0, "maxPerHour": 0 },

  "groupPolicy": {
    "enabled": true,
    "mention": { "enabled": true, "minIntervalSec": 15, "maxPerHour": 30 },
    "ambient": {
      "enabled": false,          // 没被 @ 也偶尔接话，默认关
      "minIntervalSec": 600,
      "maxPerHour": 3,
      "chance": 0.5,
      "keywords": ["汐", "她"]
    }
  },

  "limits": { "dailyEnabled": true, "dailyReplies": 200 },
  "chat": { "chunkReply": true, "maxChunks": 3, "typing": true, "styleNote": true }
}
```

被限流的消息**不进模型**，只在 `qq.log` 留一行，所以这些闸门是真省钱。

## 数据目录

```
~/.dsh/xi-qq/
  settings.json    配置
  sessions.json    对端 → DSH 会话 id 的映射（删掉就重开对话）
  status.json      桥写给控制台看的运行态
  qq.log           日志，超过 1MB 轮转
```

记忆、心情、人设（`SOUL.md` / `MEMORY.md` / `MOOD.md`）**不在这个仓库里**——那些是私人的。仓库只放代码。

## 已知限制

- 只处理文字，图片/语音只留占位符。
- 不做流式，等整轮跑完再发，中间靠「正在输入」撑着。
- DSH 的会话接口只有「喂一条 → 跑一轮」，没有「只记上下文不跑模型」，所以群里没触发她的消息她看不见，只能靠回复时补一段最近对话摘要。
- 第三方协议端有账号风险，用小号。

## License

MIT
