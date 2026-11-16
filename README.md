# 汐 · dsh-xi

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 做的一个陪伴型伴侣：一个控制台面板。

不是聊天机器人框架，是「一个具体的人」的实现：她有自己的名字、脾气、记忆和遗忘规则，代码只负责让这些东西能跑起来。

```
DSH 会话 ←→ 汐（人格 / 记忆 / 心情在 人格\ 和 记忆\）
   ↑
dsh-xi（控制台：总览 / 记忆 / 心情 / 成本 / 接入 / 形象·语音 / 性格）
```

## 一个包

| 目录 | 包名 | 作用 |
| --- | --- | --- |
| `dsh-xi/` | `dsh-xi` | 控制台插件。左侧边栏「汐」入口，只读展示人格、记忆、心情、花费。 |

仓库根同时就是运行目录：DSH 加载的 `dsh-xi/` 就是这里的文件，没有第二份副本。
改代码、回退、重启，动的是同一堆文件。运行时日志（`日志/`）在 `.gitignore` 里，不进仓库。

## QQ 通道已移除（2026-11-16）

这里原来还有一个 `xi-qq/` 包：OneBot 11 桥 + NapCat，把 QQ 私聊/群聊接进 DSH 会话。

**整个删了。** 理由是 NapCat 靠注入 QQ 客户端工作，违反平台协议，实测会触发 QQ 的文件校验、有封号风险；同设备同 IP 还会连坐，拿小号也保不住大号。现在不接任何第三方协议端，以后也不再接。

删掉的东西：`xi-qq/` 代码、`dsh-xi-qq` 包和 profile 里的 bundle 条目、`~/.dsh/xi-qq/`（含 109MB 的 NapCat）、`dsh-xi` 里的三份 QQ 配置文件（`lib/qqlink.js`、`lib/qqconfig.js`、`extensions/qq/`），以及控制台「接入」页的 QQ 入口和次级页。

## 安装

```bash
# 1. 把仓库放进任意目录，然后以本地目录安装（DSH 的 plugin_manager 也支持）
# 2. profile 的 package.json 里加依赖
"dsh-xi": "link:../path/to/dsh-xi"

# 3. 在 profile 的 bundles 列表里加上包名，重启 DSH
```

## 数据在哪

记忆、心情、人设（`SOUL.md` / `MEMORY.md` / `MOOD.md`）**不在这个仓库里**——那些是私人的，在 `E:\Ai-Agent\汐\人格\` 和 `E:\Ai-Agent\汐\记忆\`。控制台读它们，只读，不改。

## 开发与回退

- 一次功能一个 commit，重启验证过再提交；发版打 tag。
- 拉取只要 `git pull --ff-only`，合不了就停，不用自动 merge。
- 回退后要重启 DSH（`lib/` 是宿主加载，`client.js` 是页面加载），不是只刷页面。
- 决策、目录约定、回退命令：`docs/决策记录.md`。

## License

MIT
