# dsh-xi-memory

汐的记忆：让每个新会话都带着同一份记忆，换窗口、重装软件都不丢。

## 它做什么

- **归档**：`session/event` 里的 `user/message` 和 `assistant/message`，只收正文（工具过程、注入的提示词、审批通知都不进），按天写进 `记忆/archive/conversations/YYYY-MM-DD.md`，一行一条。
- **开场注入**：`MEMORY.md` 的事实和 `MOOD.md` 的状态/原因，拼成一段放进系统提示词（`xi-memory` section，order 90）。文件没变就复用，不重建。
- **检索**：`memory_find` 按字面在聊天归档和日记里找（一次 8 条、每条 200 字以内的摘要），`memory_read` 按字符分页读原文。

不调模型、不跑定时任务、不衰减、不改你的记忆文件。

## 配置

`cordis.patch.yml` 那一行：

| 键 | 默认 | 说明 |
|---|---|---|
| `memoryDir` | `E:/Ai-Agent/汐/记忆` | 记忆根目录 |
| `timeZone` | `Asia/Shanghai` | 归档按这个时区分天 |
| `partnerName` | `阿晚` | 你这一侧在归档里的名字 |
| `companionName` | `汐` | 她那一侧的名字 |
| `archiveChats` | `true` | 关掉就只注入和检索，不再新增归档 |
| `injectMemory` | `true` | 关掉就不注入常驻记忆 |
| `maxInjectChars` | `4500` | 注入的事实最多多少字 |

## 归档游标

`archive/conversations/.seen.json` 记每个会话最后归档的 `seq`，重启后不重复写。删掉它只会让下次启动重新写一遍已有消息（可能重复，不丢）。

## 回填历史

装之前已经聊过的，用脚本补：

```powershell
node scripts/backfill.mjs
```

它直接解压 `~/.dsh/sessions/*/session-*/session.v4.jsonl.zstd`（多帧 zstd，按帧解），把会话正文按同一种格式写进归档，游标一样生效，重复跑不会写两遍。

## 已知限制

- 归档范围是整个 `~/.dsh/sessions`，包括跟汐无关的活。
- 检索是字面匹配，同义说法、只有时间线索的往事找不回来。
- `memory_read` 的 ref 由 `memory_find` 生成，别手写。
