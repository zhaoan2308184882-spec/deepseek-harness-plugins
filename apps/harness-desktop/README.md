# Harness Desktop

DeepSeek Harness Web 的非官方 Windows 桌面壳。它会在后台启动 `dsh web --no-open`，并在 Electron 窗口中加载 Harness，因此不会额外打开系统浏览器。

桌面版继续使用本机 Harness 的 `web` Profile、设置和插件；它不内置 DeepSeek Harness，也不会上传本机配置、登录信息或会话数据。

## 使用条件

- Windows 10/11
- 已安装 DeepSeek Harness，并可在终端运行 `dsh.cmd web`
- 需要使用本仓库插件时，先将插件安装到 `web` Profile

## 下载和使用

在仓库的 [Releases](https://github.com/zhaoan2308184882-spec/deepseek-harness-plugins/releases) 页面下载：

- `Harness Desktop Setup 0.1.4.exe`：安装版，可选择安装位置并创建卸载信息。
- `Harness Desktop Portable 0.1.4.exe`：便携版，不需要安装，直接运行。

启动后，桌面应用会连接 `http://127.0.0.1:3080`。如果该端口已有 Harness 服务，它会直接使用现有服务；否则会自行启动服务。

页面右下角提供“重启 Harness”按钮。确认后会中止当前任务、重启后台服务并重新加载页面。

## 插件兼容性

桌面版没有独立的插件系统，它使用 Harness 原有插件机制。安装本仓库插件后，桌面版和浏览器版会读取同一份 `web` Profile 配置：

```powershell
dsh.cmd plugin --profile web add .\plugins\dsh-llm-codex
dsh.cmd plugin --profile web add .\plugins\dsh-hooks-model-router
```

## 从源码运行

```powershell
cd apps\harness-desktop
npm.cmd install
npm.cmd start
```

打包：

```powershell
npm.cmd run dist
```

## 可选环境变量

- `DSH_BIN`：自定义 `dsh` 或 `dsh.cmd` 路径。
- `HARNESS_DESKTOP_URL`：自定义 Harness Web 地址。
- `HARNESS_DESKTOP_CWD`：Harness 后台进程的默认工作目录。

## 权限与注意事项

- 桌面壳不会绕过 Harness 的沙箱、审批或文件权限。
- 关闭桌面应用时，仅会停止由该应用启动的 Harness 服务；启动前已经存在的服务不会被强制关闭。
- 使用“重启 Harness”会中断正在执行的任务，请先保存重要内容。
- 安装版升级时请先退出旧版本，避免文件被正在运行的进程占用。
