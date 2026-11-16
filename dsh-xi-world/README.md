# dsh-xi-world

汐的世界：左侧栏一个入口，打开可核查的记忆鲸鱼星海。

## 它做什么

- 宿主半侧（`lib/index.js`）：一个只读接口 `POST /api/xi-world/bundle`，把 `记忆星系.html` 和 `memory-graph.json` 一起返回。
- 客户端（`client.js`）：注册左侧栏「记忆星系」入口；点开时取一次数据，把 JSON 内嵌进页面，用 blob URL 在 iframe 里渲染。之后不再请求，星图自己转。

## 配置

`cordis.patch.yml` 里 `memoryDir` 指向记忆星系目录，默认：

```
E:/Ai-Agent/汐/汐的世界
```

## 依赖

- 页面和数据由 `E:\Ai-Agent\汐\可视化\记忆星系\build.mjs` 生成；记忆改了先跑一次 build。
- 不调模型、不写文件、不跑定时任务。

## 安装（当前 profile）

profile 的 `package.json` 加 `link:E:/Ai-Agent/汐/本体/dsh-xi-world`，并把它加进 `dsh.profile.bundles`，重启 DSH。
