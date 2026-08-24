# Role Model Router for DeepSeek Harness

非官方角色模型路由插件，可为 Planner、Executor 和 Reviewer 分别选择 Provider 与模型，并在 Harness 设置页展示路由状态和 Token 统计。

包名：`@zhaoan2308184882-spec/dsh-hooks-model-router`

## 路由模式

- **关闭**：始终使用对话框中选择的模型。
- **角色路由**：使用角色配置的模型；Reviewer 只在输入 `/review` 时调用。
- **角色路由并自动审查**：按 `Planner → Executor → Reviewer` 自动继续执行。

开启任意角色路由模式后，对话框中选择或手动切换的模型会被角色配置覆盖。

## 使用方法

```powershell
dsh.cmd plugin --profile web add .\plugins\dsh-hooks-model-router
dsh.cmd web
```

进入“设置 → 模型路由”：

1. 为三个角色分别选择 Provider 和 Model。
2. 点击“刷新模型”重新读取 Harness 当前可用 Provider。
3. 选择路由模式。
4. 使用 `/plan`、`/exec` 或 `/review` 可显式指定下一阶段角色。
5. “重置统计”只清空 Token 统计，不会重置角色模型配置。

## 权限与兼容性备注

- 三个角色共用当前 Harness 会话权限；路由插件不能单独提高某个角色的权限。
- 工作区外写入需要 Harness 会话允许，并可能触发审批；模型路由不会绕过沙箱。
- 切换不同 Provider 时，插件会清除上一个模型继承的 `reasoningEffort`，避免目标模型不支持该推理强度而报错。
- 当前固定角色和顺序为 `Planner → Executor → Reviewer`，暂不支持新增、删除或拖动角色。
- Token 统计包含输入、输出、缓存读写和推理 Token；是否都有数据取决于 Provider 是否上报对应字段。
- 安装到不含 Harness Web 设置模块的 Profile 时，后端路由可能可用，但不会出现此设置 UI。

