# 汐的 QQ

把阿晚的 QQ 私信投进对话，用 `qq_send` 一条一条回。宿主半侧是普通 Cordis 插件，**只连本机 OneBot v11 的正向 WebSocket**，不装、不碰任何 QQ 客户端。

```
QQ → OneBot（OpenQQ / 别的实现）→ ws://127.0.0.1:3001/ → 本插件 → 对话
                                              ↓
                                     qq_send → send_private_msg
```

## 它做什么

| 方向 | 行为 |
|---|---|
| 收 | 只要 `message_type: private` 且 `user_id` 等于配的主人号。别人的消息、群消息、心跳，一律只记日志 |
| 投 | 压成一行 `[QQ 私信] 昵称：内容`，走 `sessionController.prompt`（`mode: queue`，不打断正在说的话）投进对话 |
| 回 | 她调用 `qq_send`，一行一条，最多六条，条间隔 800ms |
| 查 | `qq_status` 看连没连上、登的是哪个号、最近收到什么 |

去重按 `message_id`；同一条只投一次，重启也不重投（内存里留最近 200 条）。

## 配置（`cordis.patch.yml`）

```yaml
- insert:
    - id: dsh-xi-qq
      name: dsh-xi-qq
      config:
        onebotUrl: ws://127.0.0.1:3001/
        accessToken: ''      # OpenQQ 配的 token；空 = 不校验
        ownerUin: ''         # 阿晚的 QQ 号；不填就什么都不投
        sessionId: ''        # 投到哪段对话；空 = 最近活跃的那段
        dryRun: true         # true = 只记日志，不投递
        replyMaxLines: 6
        gapMs: 800
        maxInboundChars: 2000
        logFile: ''          # 默认 ~/.dsh/xi-qq.log
```

**默认 `dryRun: true`**：没填主人号之前，收到什么都只落在 `~/.dsh/xi-qq.log` 里，不会往对话里扔。

## 没装 OneBot 也能测

```powershell
node tools/fake-onebot.mjs
# 另一个窗口，假装主人发一条
curl.exe "http://127.0.0.1:3001/say?from=20002&text=在吗"
# 看插件发出去的
curl.exe "http://127.0.0.1:3001/sent"
```

## 边界

- **只认一个号**：`ownerUin` 之外的人发什么都不进来，也就没有待审队列这套东西。
- **DSH 不在线就收不到**：桥在 Host 进程里，关掉 DSH 等于离线。
- **不碰 QQ 客户端**：登录、扫码、收发都是 OneBot 实现那边的事，这里只跟 `127.0.0.1` 说话。
- **群聊不做**：只做私信。

## 风险

挂接 QQ 客户端（OpenQQ / NapCat 都一样）可能违反《QQ 软件许可及服务协议》，账号有被限制或封禁的风险。这个插件把自己这一侧做得尽量干净，但**改变不了上游那一段的风险**——所以只拿专门的号去试，别拿主号。
