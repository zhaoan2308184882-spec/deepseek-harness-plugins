/** Bidirectional Codex app-server transport with DSH-owned approvals. */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'

export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

export interface AppServerConnection {
  bin: string
  codexHome: string
  cwd: string
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access'
}

export interface AppServerApprovalRequest {
  sessionId: NonNullable<GenerateOptions['sessionId']>
  toolName: string
  reason: string
  signal?: AbortSignal
}

export interface AppServerOptions {
  connection: AppServerConnection
  generation: GenerateOptions
  prompt: string
  requestApproval: (request: AppServerApprovalRequest) => Promise<ApprovalOutcome>
}

type JsonObject = Record<string, unknown>

function object(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null ? value as JsonObject : undefined
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function approvalDecision(outcome: ApprovalOutcome): 'accept' | 'decline' | 'cancel' {
  if (outcome === 'allowed-once') return 'accept'
  if (outcome === 'cancelled') return 'cancel'
  return 'decline'
}

function approvalReason(method: string, params: JsonObject): string {
  const explicit = string(params.reason)
  const command = string(params.command)
  const cwd = string(params.cwd)
  const root = string(params.grantRoot)
  const pieces = [explicit, command === undefined ? undefined : `命令：${command}`,
    cwd === undefined ? undefined : `工作目录：${cwd}`,
    root === undefined ? undefined : `申请写入目录：${root}`].filter((part): part is string => part !== undefined)
  if (pieces.length > 0) return pieces.join('\n')
  return method === 'item/fileChange/requestApproval'
    ? 'Codex 请求执行超出当前工作区的文件修改。'
    : 'Codex 请求执行需要越过当前沙箱限制的命令。'
}

function toolName(method: string): string {
  if (method === 'item/fileChange/requestApproval' || method === 'applyPatchApproval') {
    return 'Codex 文件修改'
  }
  return 'Codex 命令执行'
}

function sandboxPolicy(connection: AppServerConnection): JsonObject {
  if (connection.sandboxMode === 'danger-full-access') return { type: 'dangerFullAccess' }
  if (connection.sandboxMode === 'read-only') return { type: 'readOnly', networkAccess: false }
  return {
    type: 'workspaceWrite',
    writableRoots: [connection.cwd],
    networkAccess: false,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false,
  }
}

class AsyncQueue<T> {
  private readonly values: T[] = []
  private readonly waiters: Array<(value: T | undefined) => void> = []
  private closed = false

  push(value: T): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter === undefined) this.values.push(value)
    else waiter(value)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    for (const waiter of this.waiters.splice(0)) waiter(undefined)
  }

  async next(): Promise<T | undefined> {
    const value = this.values.shift()
    if (value !== undefined) return value
    if (this.closed) return undefined
    return new Promise(resolve => { this.waiters.push(resolve) })
  }
}

interface PendingRequest {
  resolve: (value: JsonObject) => void
  reject: (error: Error) => void
}

/** Run one ephemeral Codex thread while forwarding sandbox asks to DSH. */
export async function* streamViaAppServer(options: AppServerOptions): AsyncIterable<StreamChunk> {
  const { connection, generation } = options
  if (generation.sessionId === undefined) throw new Error('interactive approval requires a session id')

  const child = spawn(connection.bin, ['app-server', '--stdio'], {
    cwd: connection.cwd,
    env: { ...process.env, CODEX_HOME: connection.codexHome },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdin.setDefaultEncoding('utf8')
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')

  let stderr = ''
  child.stderr.on('data', (chunk: string) => { stderr += chunk })
  const notifications = new AsyncQueue<JsonObject>()
  const pending = new Map<number, PendingRequest>()
  let nextRequestId = 1
  let readerError: Error | undefined

  const send = (message: JsonObject): void => {
    child.stdin.write(`${JSON.stringify(message)}\n`)
  }
  const request = (method: string, params: JsonObject): Promise<JsonObject> => {
    const id = nextRequestId++
    send({ id, method, params })
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }) })
  }

  const answerApproval = async (message: JsonObject): Promise<void> => {
    const id = message.id
    const method = string(message.method)
    const params = object(message.params) ?? {}
    if ((typeof id !== 'number' && typeof id !== 'string') || method === undefined) return
    const outcome = await options.requestApproval({
      sessionId: generation.sessionId!,
      toolName: toolName(method),
      reason: approvalReason(method, params),
      signal: generation.signal,
    })
    if (method === 'item/permissions/requestApproval') {
      const requested = object(params.permissions) ?? {}
      const permissions: JsonObject = {}
      if (outcome === 'allowed-once') {
        const network = object(requested.network)
        const fileSystem = object(requested.fileSystem)
        if (network !== undefined) permissions.network = network
        if (fileSystem !== undefined) permissions.fileSystem = fileSystem
      }
      send({ id, result: { permissions, scope: 'turn' } })
      return
    }
    const decision = approvalDecision(outcome)
    send({ id, result: { decision } })
  }

  const reader = (async (): Promise<void> => {
    try {
      const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
      for await (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) continue
        let message: JsonObject | undefined
        try { message = object(JSON.parse(trimmed)) } catch { continue }
        if (message === undefined) continue
        const method = string(message.method)
        const id = message.id
        if (method !== undefined && id !== undefined) {
          if (method === 'item/commandExecution/requestApproval'
            || method === 'item/fileChange/requestApproval'
            || method === 'item/permissions/requestApproval'
            || method === 'execCommandApproval'
            || method === 'applyPatchApproval') {
            void answerApproval(message).catch((error: unknown) => {
              send({ id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } })
            })
          } else {
            send({ id, error: { code: -32601, message: `Unsupported app-server request: ${method}` } })
          }
          continue
        }
        if (typeof id === 'number' && method === undefined) {
          const waiter = pending.get(id)
          if (waiter === undefined) continue
          pending.delete(id)
          const error = object(message.error)
          if (error !== undefined) waiter.reject(new Error(string(error.message) ?? `app-server request ${id} failed`))
          else waiter.resolve(object(message.result) ?? {})
          continue
        }
        if (method !== undefined) notifications.push(message)
      }
    } catch (error) {
      readerError = error instanceof Error ? error : new Error(String(error))
    } finally {
      notifications.close()
      const failure = readerError ?? new Error(stderr.trim() || 'Codex app-server closed unexpectedly')
      for (const waiter of pending.values()) waiter.reject(failure)
      pending.clear()
    }
  })()

  const abort = (): void => { child.kill() }
  generation.signal?.addEventListener('abort', abort, { once: true })

  let pendingAgentMessage: string | undefined
  let reasoningText = ''
  let reasoningIndex: number | undefined
  let nextBlockIndex = 0
  const emitReasoning = function* (text: string): Generator<StreamChunk> {
    if (reasoningIndex === undefined) {
      reasoningIndex = nextBlockIndex++
      yield { type: 'block-start', index: reasoningIndex, blockType: 'reasoning' }
    }
    reasoningText += text
    yield { type: 'reasoning-delta', index: reasoningIndex, text }
  }

  try {
    await request('initialize', {
      clientInfo: { name: 'dsh-llm-codex', title: 'DeepSeek Harness', version: '0.1.1' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    })
    send({ method: 'initialized' })
    const started = await request('thread/start', {
      model: generation.model,
      cwd: connection.cwd,
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
      sandbox: connection.sandboxMode,
      ephemeral: true,
    })
    const thread = object(started.thread)
    const threadId = string(thread?.id)
    if (threadId === undefined) throw new Error('Codex app-server returned no thread id')
    await request('turn/start', {
      threadId,
      input: [{ type: 'text', text: options.prompt, text_elements: [] }],
      model: generation.model,
      sandboxPolicy: sandboxPolicy(connection),
      ...(generation.reasoningEffort === undefined ? {} : { effort: generation.reasoningEffort }),
    })

    let completed = false
    while (!completed) {
      const message = await notifications.next()
      if (message === undefined) break
      const method = string(message.method)
      const params = object(message.params) ?? {}
      if (method === 'item/completed') {
        const item = object(params.item)
        const type = string(item?.type)
        if (type === 'agentMessage') {
          const text = string(item?.text)
          if (text !== undefined && text.length > 0) {
            if (pendingAgentMessage !== undefined) yield* emitReasoning(`${pendingAgentMessage}\n`)
            pendingAgentMessage = text
          }
        } else if (type === 'commandExecution') {
          const command = string(item?.command)
          yield* emitReasoning(command === undefined ? '命令执行完成\n' : `命令执行完成：${command}\n`)
        } else if (type === 'fileChange') {
          yield* emitReasoning('文件修改完成\n')
        }
      } else if (method === 'turn/completed') {
        const turn = object(params.turn)
        const status = string(turn?.status)
        if (status === 'failed') {
          const error = object(turn?.error)
          throw new Error(string(error?.message) ?? 'Codex turn failed')
        }
        completed = true
      } else if (method === 'error') {
        const messageText = string(params.message)
        if (messageText !== undefined) yield* emitReasoning(`Codex：${messageText}\n`)
      }
    }

    if (!completed) throw readerError ?? new Error(stderr.trim() || 'Codex app-server ended before turn completion')
    if (reasoningIndex !== undefined) {
      yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoningText } }
    }
    if (pendingAgentMessage === undefined || pendingAgentMessage.trim().length === 0) {
      yield { type: 'finish', reason: { kind: 'error', failure: { message: 'Codex returned an empty response', code: 'EMPTY_RESPONSE' } } }
      return
    }
    const answer = pendingAgentMessage.trim()
    const textIndex = nextBlockIndex++
    yield { type: 'block-start', index: textIndex, blockType: 'text' }
    yield { type: 'text-delta', index: textIndex, text: answer }
    yield { type: 'block-end', index: textIndex, block: { type: 'text', text: answer } }
    yield { type: 'usage', usage: { inputTokens: estimateTokens(options.prompt), outputTokens: estimateTokens(answer) } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  } finally {
    generation.signal?.removeEventListener('abort', abort)
    if (child.exitCode === null) child.kill()
    await reader.catch(() => {})
  }
}
