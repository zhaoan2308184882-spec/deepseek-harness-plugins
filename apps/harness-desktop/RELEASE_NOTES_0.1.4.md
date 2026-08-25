# Harness Desktop 0.1.4

DeepSeek Harness Web 的非官方 Windows 桌面壳。

## 本版功能

- 后台运行 `dsh web --no-open`，不额外打开浏览器。
- 在独立 Electron 窗口中使用 Harness。
- 沿用本机 `web` Profile、设置和已安装插件。
- 支持安装版和免安装便携版。
- 页面右下角提供“重启 Harness”按钮。
- 安装目录页面直接显示最终的 `harness-desktop` 目录，并避免重复追加目录名。

## 下载选择

- `Harness Desktop Setup 0.1.4.exe`：标准安装版。
- `Harness Desktop Portable 0.1.4.exe`：免安装便携版。

## 使用前提

本应用不内置 DeepSeek Harness。请先安装 Harness，并确认 `dsh.cmd web` 可以正常启动。桌面版不会绕过 Harness 的沙箱、审批和文件权限。

## SHA-256

```text
DD1AFCF765D3B5FAC7C5A7595B1689D2E3B10860394DF1D2046AAC7CD453A61E  Harness Desktop Setup 0.1.4.exe
23FFCFE6C18079E71CF9FDB6E51F3149AB363D7F28415529F71CE86E4DEC6F5F  Harness Desktop Portable 0.1.4.exe
```
