# Codex Provider for DeepSeek Harness

非官方 Codex Provider，将本机 Codex CLI 接入 DeepSeek Harness，并把模型配置合并进 Harness 的“设置 → 模型”页面。

包名：`@zhaoan2308184882-spec/dsh-llm-codex`

## 功能

- 使用本机 Codex CLI 和现有 ChatGPT/Codex 登录状态
- 自动读取 `~/.codex/models_cache.json` 中的可用模型
- 根据模型缓存设置上下文长度和可选推理强度
- 转发流式文本、推理内容、Token 使用量和工具调用
- 将 Harness 会话沙箱和审批请求桥接给 Codex

## 安装与配置

```powershell
codex login status
dsh.cmd plugin --profile web add .\plugins\dsh-llm-codex
dsh.cmd web
```

进入“设置 → 模型”，找到 Codex：

- `codexPath` 留空时从系统 `PATH` 查找 `codex`；找不到时填写完整可执行文件路径。
- `codexHome` 留空时使用 `~/.codex`；使用独立配置目录时填写对应路径。
- 选择模型后，插件优先采用 Codex 模型缓存中声明的最大上下文长度。

## 备注

- 本插件面向 Codex CLI 的账号登录模式，不等同于直接调用 OpenAI API。
- 必须先执行 `codex login`；插件不会保存、复制或上传 Codex 凭据。
- 实际可用模型、上下文长度和推理强度取决于本机 Codex CLI 返回的数据。
- 沙箱权限来自当前 Harness 会话。选择“工作区可写”不代表可以直接写入工作区外目录。
- 插件会替换 Harness 原有模型设置模块；与其他修改同一设置模块的插件可能冲突。

