# DeepSeek Harness Community Plugins

面向 DeepSeek Harness 的非官方社区插件集合。目前针对 Harness `0.1.1-rc.2` 适配，仓库同时包含 TypeScript 源码和可直接加载的 `lib` 构建产物。

> 非官方项目：本仓库不隶属于 DeepSeek，包名使用维护者个人作用域，避免与官方包混淆。

## 包含的插件

| 插件 | 用途 | 设置位置 |
| --- | --- | --- |
| [`dsh-llm-codex`](plugins/dsh-llm-codex) | 通过本机 Codex CLI 为 Harness 提供 Codex 模型 | 设置 → 模型 |
| [`dsh-hooks-model-router`](plugins/dsh-hooks-model-router) | 为 Planner、Executor、Reviewer 配置不同模型 | 设置 → 模型路由 |

## 前置条件

- Windows、macOS 或 Linux
- Node.js 和 DeepSeek Harness `0.1.1-rc.2`
- 使用 Codex 插件时，需要安装 Codex CLI 并完成登录

检查环境：

```powershell
node --version
dsh.cmd --version
codex --version
codex login status
```

PowerShell 如果禁止执行 `dsh.ps1`，请使用文档中的 `dsh.cmd`。

## 安装

```powershell
git clone https://github.com/zhaoan2308184882-spec/deepseek-harness-plugins.git
cd deepseek-harness-plugins

dsh.cmd plugin --profile web add .\plugins\dsh-llm-codex
dsh.cmd plugin --profile web add .\plugins\dsh-hooks-model-router
dsh.cmd web
```

安装后打开 Harness 的“设置”：

1. 在“模型”中检查 Codex Provider、Codex CLI 路径和可用模型。
2. 在“模型路由”中为 Planner、Executor、Reviewer 选择 Provider 和模型。
3. 首次使用建议先关闭路由，单独测试 Codex 模型能否正常回复，再开启角色路由。

## 更新

```powershell
cd deepseek-harness-plugins
git pull
dsh.cmd plugin --profile web add .\plugins\dsh-llm-codex --force
dsh.cmd plugin --profile web add .\plugins\dsh-hooks-model-router --force
```

更新后请完全停止并重新启动 `dsh web`。如果当前 DSH CLI 不接受 `--force`，先移除旧插件后重新执行安装命令。

## 卸载

```powershell
dsh.cmd plugin --profile web remove @zhaoan2308184882-spec/dsh-llm-codex
dsh.cmd plugin --profile web remove @zhaoan2308184882-spec/dsh-hooks-model-router
```

卸载后重新启动 `dsh web`。

## 重要备注

- 两个插件默认安装到 `web` Profile；安装到其他 Profile 不保证有设置界面。
- Codex 插件使用本机 Codex 登录状态，不会把 `auth.json`、API Key 或个人 `settings.yaml` 上传到本仓库。
- 路由开启后，以角色配置的模型为准，对话框中选择或切换的模型不会生效。
- 模型路由继承当前 Harness 会话权限，不会自行提升沙箱权限。能否写入工作区外目录仍由会话权限和审批策略决定。
- Planner、Executor、Reviewer 当前共用同一套会话权限，不能为单独角色配置更高权限。
- 角色执行顺序当前固定为 `Planner → Executor → Reviewer`；自定义增删角色和调整顺序尚未开放。
- Token 统计是当前路由会话的累计数据，可在模型路由页面重置。
- Harness 仍处于 RC 阶段，升级 Harness 后可能需要重新适配。遇到加载错误时请同时提供 Harness 版本、Node.js 版本和完整日志。

## License

[MIT](LICENSE)

