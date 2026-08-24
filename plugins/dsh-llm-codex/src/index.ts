/**
 * Register a local Codex CLI adapter on the DSH LLM seam. Configuration is
 * resolved per operation, so settings changes affect the next request while
 * an in-flight request keeps the snapshot it started with.
 * @module @zhaoan2308184882-spec/dsh-llm-codex
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { CodexAdapter, discoverCodexModels } from './adapter.ts'
import type { CodexCatalogModel, CodexConnectionOptions, SandboxMode } from './adapter.ts'

export { CodexAdapter, discoverCodexModels, resolveCodexBinary, resolveModelContextWindow } from './adapter.ts'
export type { CodexAdapterOptions, CodexCatalogModel, CodexConnectionOptions, SandboxMode } from './adapter.ts'
export { serialize } from './serialize.ts'

export const name = 'llm-codex'
export const inject = ['llm', 'agents', 'approval']

const NS = settingsNamespace('llm-codex')
const PROVIDER = 'codex'

// ChatGPT-account (subscription) codex models, per ~/.codex/models_cache.json
// (slug list). API-billing ids like gpt-5.1-codex-mini are NOT supported here.
const DEFAULT_MODELS: CodexCatalogModel[] = [
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', contextWindow: 272000 },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', contextWindow: 272000 },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', contextWindow: 272000 },
  { id: 'gpt-5.5', name: 'GPT-5.5', contextWindow: 272000 },
  { id: 'gpt-5.4', name: 'GPT-5.4', contextWindow: 272000 },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', contextWindow: 272000 },
]

/** Settings-section shape for the local Codex CLI provider. */
export interface Config {
  codexPath?: string
  codexHome?: string
  cwd?: string
  sandboxMode?: SandboxMode
  /** Default reasoning effort materialized when the caller omits one; defaults to 'low'. */
  defaultReasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra'
  models?: CodexCatalogModel[]
}

const catalogModel: z<CodexCatalogModel> = z.object({
  id: z.string().required(),
  name: z.string(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
})

export const Config: z<Config> = z.object({
  codexPath: z.string(),
  codexHome: z.string(),
  cwd: z.string(),
  sandboxMode: z.union(['read-only', 'workspace-write', 'danger-full-access']).default('read-only'),
  defaultReasoningEffort: z.union(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']).default('low'),
  models: z.array(catalogModel).default(DEFAULT_MODELS),
})

function resolveModels(models: readonly CodexCatalogModel[] | undefined): CodexCatalogModel[] {
  const seen = new Set<string>()
  return (models ?? DEFAULT_MODELS).map((model) => {
    if (model.id.length === 0) throw new Error('llm-codex: catalog model ids must be non-empty')
    if (model.name !== undefined && model.name.length === 0) {
      throw new Error(`llm-codex: catalog model "${model.id}" has an empty name`)
    }
    if (model.contextWindow !== undefined
      && (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)) {
      throw new Error(`llm-codex: catalog model "${model.id}" contextWindow must be a positive safe integer`)
    }
    if (model.maxTokens !== undefined
      && (!Number.isSafeInteger(model.maxTokens) || model.maxTokens <= 0)) {
      throw new Error(`llm-codex: catalog model "${model.id}" maxTokens must be a positive safe integer`)
    }
    if (seen.has(model.id)) throw new Error(`llm-codex: duplicate catalog model "${model.id}"`)
    seen.add(model.id)
    return { ...model }
  })
}

/** Resolve and validate one immutable configuration generation. */
export function resolveAdapterOptions(config: Config): CodexConnectionOptions {
  const stringOption = (value: string | undefined, field: string): string | undefined => {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    // An untouched optional browser field is commonly stored as an empty
    // string. Empty means automatic/default, not an invalid configuration.
    if (trimmed.length === 0) return undefined
    return trimmed
  }
  const codexPath = stringOption(config.codexPath, 'codexPath')
  const codexHome = stringOption(config.codexHome, 'codexHome')
  const cwd = stringOption(config.cwd, 'cwd')
  return {
    ...codexPath === undefined ? {} : { codexPath },
    ...codexHome === undefined ? {} : { codexHome },
    ...cwd === undefined ? {} : { cwd },
    sandboxMode: config.sandboxMode ?? 'read-only',
    defaultReasoningEffort: config.defaultReasoningEffort ?? 'low',
    models: resolveModels(config.models),
  }
}

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  let lastRaw: Config | undefined
  let lastGood: CodexConnectionOptions | undefined
  const options = (): CodexConnectionOptions => {
    const raw = current()
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = resolveAdapterOptions(raw)
      lastRaw = raw
      lastGood = next
      return next
    } catch (error) {
      if (lastGood === undefined) throw error
      lastRaw = raw
      ctx.logger.error('llm-codex: keeping the last good configuration after an invalid settings section')
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  // dsh-user-approval is supplied by the host composition. Keep the local
  // plugin's build independent of that host-only package while still using its
  // narrow public seam.
  const services = ctx as Context & {
    agents: { get(id: SessionId): Agent | undefined }
    approval: {
      request(request: {
        agent: Agent
        toolName: string
        reason?: string
        signal?: AbortSignal
      }): Promise<'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'>
    }
  }
  const adapter = new CodexAdapter({
    options,
    requestApproval: async (request) => {
      const agent = services.agents.get(request.sessionId)
      if (agent === undefined) return 'unavailable'
      return services.approval.request({
        agent,
        toolName: request.toolName,
        reason: request.reason,
        signal: request.signal,
      })
    },
  })
  ctx.llm.registerConfigurableProviders([
    { provider: PROVIDER, displayName: 'Codex', settingsNs: NS, settingsPath: [] },
  ])
  ctx.llm.registerAdapter([PROVIDER], adapter)
  ctx.llm.registerModelDiscovery(NS, async (request) => {
    if (request.signal?.aborted) return []
    return discoverCodexModels(options())
  })
  installSettingsSection(ctx, NS, Config, config, {
    setSource: source => { current = source },
    onChange: () => { options() },
  })
}
