const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { spawn, execFile } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

const HARNESS_URL = process.env.HARNESS_DESKTOP_URL || 'http://127.0.0.1:3080'
const START_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 500

let mainWindow
let harnessProcess
let ownsHarnessProcess = false
let startPromise
let state = { status: 'idle', message: '准备启动 Harness…', logs: [] }

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${String(message).trimEnd()}`
  if (!line.trim()) return
  state.logs = [...state.logs.slice(-199), line]
  sendState()
}

function setState(status, message) {
  state = { ...state, status, message }
  sendState()
}

function sendState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('harness:state', state)
  }
}

function isHarnessReady() {
  return new Promise((resolve) => {
    const request = http.get(HARNESS_URL, { timeout: 1_500 }, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 500)
    })
    request.on('timeout', () => {
      request.destroy()
      resolve(false)
    })
    request.on('error', () => resolve(false))
  })
}

function findDshCommand() {
  if (process.env.DSH_BIN) return process.env.DSH_BIN
  if (process.platform !== 'win32') return 'dsh'

  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'dsh.cmd'),
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'dsh.cmd'),
  ]
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || 'dsh.cmd'
}

function spawnHarness() {
  const command = findDshCommand()
  log(`启动命令：${command} web --no-open`)

  const child = spawn(command, ['web', '--no-open'], {
    cwd: process.env.HARNESS_DESKTOP_CWD || os.homedir(),
    windowsHide: true,
    shell: process.platform === 'win32',
    env: { ...process.env, FORCE_COLOR: '0' },
  })

  harnessProcess = child
  ownsHarnessProcess = true
  child.stdout?.on('data', (chunk) => log(chunk.toString()))
  child.stderr?.on('data', (chunk) => log(chunk.toString()))
  child.on('error', (error) => {
    log(error.stack || error.message)
    setState('error', `无法启动 dsh：${error.message}`)
  })
  child.on('exit', (code, signal) => {
    log(`Harness 已退出（code=${code ?? '-'}, signal=${signal ?? '-'}）`)
    harnessProcess = undefined
    ownsHarnessProcess = false
    if (state.status !== 'stopping') {
      setState('error', 'Harness 服务已停止，请点击“重新启动”。')
    }
  })
}

async function waitUntilReady() {
  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await isHarnessReady()) return true
    if (state.status === 'error') return false
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return false
}

async function startHarness() {
  if (startPromise) return startPromise
  startPromise = (async () => {
    setState('starting', '正在连接 DeepSeek Harness…')

    if (await isHarnessReady()) {
      ownsHarnessProcess = false
      log(`发现已运行的 Harness：${HARNESS_URL}`)
    } else {
      spawnHarness()
      if (!(await waitUntilReady())) {
        if (state.status !== 'error') {
          setState('error', '启动超时。请查看日志，确认 dsh web 能否正常运行。')
        }
        return false
      }
    }

    setState('ready', 'Harness 已就绪')
    await mainWindow.loadURL(HARNESS_URL)
    return true
  })().finally(() => {
    startPromise = undefined
  })
  return startPromise
}

function stopHarness() {
  if (!harnessProcess || !ownsHarnessProcess) return
  setState('stopping', '正在关闭 Harness…')
  const pid = harnessProcess.pid
  if (process.platform === 'win32' && pid) {
    execFile('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { windowsHide: true }, () => {})
  } else {
    harnessProcess.kill('SIGTERM')
  }
}

function listenerPid() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32' || HARNESS_URL !== 'http://127.0.0.1:3080') {
      resolve(undefined)
      return
    }
    execFile('netstat.exe', ['-ano', '-p', 'tcp'], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve(undefined)
        return
      }
      for (const line of stdout.split(/\r?\n/)) {
        const match = line.trim().match(/^TCP\s+127\.0\.0\.1:3080\s+\S+\s+LISTENING\s+(\d+)$/i)
        if (match) {
          resolve(Number(match[1]))
          return
        }
      }
      resolve(undefined)
    })
  })
}

function killProcessTree(pid) {
  return new Promise((resolve) => {
    if (!pid) {
      resolve()
      return
    }
    if (process.platform === 'win32') {
      execFile('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { windowsHide: true }, () => resolve())
    } else {
      try { process.kill(pid, 'SIGTERM') } catch {}
      resolve()
    }
  })
}

async function waitUntilStopped(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isHarnessReady())) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

async function restartHarness() {
  if (startPromise) return false
  await mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  setState('stopping', '正在重启 DeepSeek Harness…')

  const pid = harnessProcess?.pid || await listenerPid()
  if (pid) {
    log(`正在停止 Harness 进程树：${pid}`)
    await killProcessTree(pid)
    await waitUntilStopped()
  }
  harnessProcess = undefined
  ownsHarnessProcess = false
  state = { ...state, status: 'idle', message: '正在重新启动 Harness…' }
  return startHarness()
}

function injectDesktopControls() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents.getURL().startsWith(HARNESS_URL)) return
  mainWindow.webContents.executeJavaScript(`
    (() => {
      if (document.querySelector('[data-harness-desktop-restart]')) return;
      const button = document.createElement('button');
      button.dataset.harnessDesktopRestart = 'true';
      button.type = 'button';
      button.textContent = '重启 Harness';
      button.title = '停止并重新启动 Harness 后台服务';
      Object.assign(button.style, {
        position: 'fixed', right: '18px', bottom: '18px', zIndex: '2147483647',
        height: '36px', padding: '0 14px', border: '1px solid rgba(255,255,255,.18)',
        borderRadius: '9px', background: '#303034', color: '#f4f4f5',
        font: '13px Segoe UI, Microsoft YaHei, sans-serif', cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(0,0,0,.28)'
      });
      button.addEventListener('mouseenter', () => { button.style.background = '#3f3f46'; });
      button.addEventListener('mouseleave', () => { button.style.background = '#303034'; });
      button.addEventListener('click', async () => {
        if (!confirm('确定要重启 Harness 后台服务吗？当前正在生成的任务会被中止。')) return;
        button.disabled = true;
        button.textContent = '正在重启…';
        await window.harnessDesktop.restart();
      });
      document.body.appendChild(button);
    })();
  `).catch((error) => log(`无法注入重启按钮：${error.message}`))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#171717',
    title: 'Harness Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(HARNESS_URL)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  mainWindow.webContents.on('did-finish-load', injectDesktopControls)
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  startHarness()
}

ipcMain.handle('harness:get-state', () => state)
ipcMain.handle('harness:retry', async () => {
  if (harnessProcess) stopHarness()
  state = { status: 'idle', message: '准备重新启动…', logs: state.logs }
  await mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  return startHarness()
})
ipcMain.handle('harness:restart', restartHarness)
ipcMain.handle('harness:open-logs', () => ({ logs: state.logs }))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', stopHarness)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
