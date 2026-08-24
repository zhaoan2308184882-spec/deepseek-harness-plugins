# DeepSeek Harness Community Plugins

面向 DeepSeek Harness 的非官方社区插件集合。目前针对 `0.1.1-rc.2` 适配，仓库包含可直接加载的构建产物和 TypeScript 源码。

> 本项目不是 DeepSeek 官方项目，也不隶属于 DeepSeek。插件包使用个人作用域，避免与官方包混淆。

## 插件

### Codex Provider

目录：[`plugins/dsh-llm-codex`](plugins/dsh-llm-codex)

- 通过本机 Codex CLI 接入 Harness
- 在 Harness 模型设置中配置 Codex Provider 和模型
- 桥接工具审批与沙箱权限
- 根据所选模型使用相应的上下文长度

### Role Model Router

目录：[`plugins/dsh-hooks-model-router`](plugins/dsh-hooks-model-router)

- 为 Planner、Executor、Reviewer 分别配置 Provider 和模型
- 支持关闭、角色路由、角色路由并自动审查三种模式
- 展示各角色 Token 使用统计并支持重置
- 与当前会话权限保持一致，不自行提升沙箱权限

## 从源码安装

要求：Node.js、DeepSeek Harness `0.1.1-rc.2`，以及已登录的 Codex CLI（使用 Codex 插件时）。

```powershell
git clone https://github.com/zhaoan2308184882-spec/deepseek-harness-plugins.git
cd deepseek-harness-plugins
dsh.cmd plugin --profile web add .\plugins\dsh-llm-codex
dsh.cmd plugin --profile web add .\plugins\dsh-hooks-model-router
dsh.cmd web
```

若 PowerShell 允许执行 npm 脚本，也可以把 `dsh.cmd` 换成 `dsh`。安装后在 Harness 的“设置”页面配置 Codex 模型和模型路由。

## 兼容性

当前版本基于 DeepSeek Harness `0.1.1-rc.2` 开发和验证。Harness 仍处于 RC 阶段，后续版本可能需要重新适配。

## 安全说明

- 仓库不包含 Codex 登录凭据、API Key 或个人 `settings.yaml`。
- 模型路由继承当前会话权限；能否写入工作区外目录由 Harness 会话沙箱和审批策略决定。
- 安装第三方插件前请自行审查源码。

## License

[MIT](LICENSE)

