# dsh-xi-memory

汐的记忆：让每个新会话都带着同一份记忆，换窗口、重装软件都不丢。

## 它做什么

- **归档**：`session/event` 里的 `user/message` 与 `assistant/message`，只取正文（工具过程、注入的提示词、审批通知都不进），按天写进 `记忆/短期记忆/对话/YYYY-MM-DD.md`，一行一条。
- **开场注入**：`MEMORY.md` 的事实、`MOOD.md` 的状态、`珍贵的记忆/索引.md` 的标题，拼成一段放进系统提示词（`xi-memory` section，order 90）。文件没变就复用，不重建。
- **检索**：`memory_find` 按字面在五个区里找（一次 8 条、每条摘要），`memory_read` 按字符分页读原文。
- **归档页**：并进汐控制台的「归档」标签。

不调模型、不跑定时任务、不衰减、不改你的记忆文件。

## 各区

| kind | 扫哪里 |
|---|---|
| `conversation` | 短期记忆/对话、遗忘的记忆/对话 |
| `diary` | 短期记忆/日记、遗忘的记忆/日记 |
| `permanent` | 永久记忆/ |
| `precious` | 珍贵的记忆/ |
| `forgotten` | 遗忘的记忆/（对话、日记、事实） |
| 不填 | 全部 |

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

`短期记忆/对话/.seen.json` 记每个会话最后归档的 `seq`，重启后不重复写。删掉它只会让下次启动重写一遍已有消息（可能重复，不丢）。

## 回填历史

装之前已经聊过的，用脚本补：

```powershell
node scripts/backfill.mjs
```

它直接解压 `~/.dsh/sessions/*/session-*/session.v4.jsonl.zstd`（多帧 zstd，按帧解），把会话正文按同一种格式写进 `短期记忆/对话/`，游标一样生效。

## 已知限制

- 检索是字面匹配，同义说法、只有时间线索的往事找不回来。
- `memory_read` 的 ref 由 `memory_find` 生成，别手写。
