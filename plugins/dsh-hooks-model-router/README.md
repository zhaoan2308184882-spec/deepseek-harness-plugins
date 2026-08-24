# Role Model Router for DeepSeek Harness

非官方角色模型路由插件，可分别配置 Planner、Executor 和 Reviewer，并在 Harness 设置页展示路由状态和 Token 统计。

包名：`@zhaoan2308184882-spec/dsh-hooks-model-router`

路由开启时，会话对话框中选择的模型会被角色配置覆盖。插件继承当前会话权限，不自行提升沙箱权限。

