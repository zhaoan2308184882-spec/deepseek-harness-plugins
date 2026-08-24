import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { createUserMessage, type LlmCallConfig } from '@deepseek-ai/dsh-llm'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { registerRouterCommands } from './command.ts'
import { ModelRouter } from './router.ts'
import type { ModelTarget, RouterConfig } from './router.ts'
import { routerUsageProjectionDefinition } from './usage-projection.ts'

export const name = 'hooks-model-router'
export const inject = ['commands']

interface UsageOffset {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
}

export interface Config extends RouterConfig {
  /** Per-route display baselines; resetting never mutates durable session history. */
  usageOffsets?: Record<string, UsageOffset>
}

// schemastery object fields are optional unless their inner fields are
// .required(); a nested target must stay all-optional so an unconfigured
// plugin loads (empty composition config). The router guards completeness.
const modelTarget: z<ModelTarget> = z.object({
  provider: z.string(),
  model: z.string(),
})

const usageOffset: z<UsageOffset> = z.object({
  inputTokens: z.number().step(1).min(0),
  outputTokens: z.number().step(1).min(0),
  cacheReadTokens: z.number().step(1).min(0),
  cacheWriteTokens: z.number().step(1).min(0),
  reasoningTokens: z.number().step(1).min(0),
})

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(false),
  // Default false: role routing is the point of this plugin; the initial
  // dialog selection equals the agent baseline and cannot be distinguished
  // from a default (agent/request carries no selection provenance).
  respectUserSelection: z.boolean().default(false),
  planner: modelTarget,
  executor: modelTarget,
  reviewer: modelTarget,
  sequence: z.array(z.union(['planner', 'executor', 'reviewer'])).default(['planner', 'executor', 'reviewer']),
  usageOffsets: z.dict(usageOffset).default({}),
  // `manual` remains accepted so older settings files keep loading; it now
  // behaves like ordinary role routing and is replaced when saved in the UI.
  rule: z.union(['auto', 'review', 'manual']).default('auto'),
})

const NS = settingsNamespace('model-router')

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  installSettingsSection(ctx, NS, Config, config, {
    setSource: source => { current = source },
    onChange: () => {},
  })

  const router = new ModelRouter(() => current())
  registerRouterCommands(ctx, router)

  // Optional capability: web/headless profiles with session projections get
  // durable per-route token accounting; smaller compositions keep routing.
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    const registry = (projectionCtx as Context & {
      sessionProjections: { register(definition: unknown): () => void }
    }).sessionProjections
    registry.register(routerUsageProjectionDefinition)
  })

  // Scoped events are globally observable from a root Context. The payload's
  // exact Agent owns both the session history and the per-session phase key.
  ctx.on('agent/request', async (payload, next): Promise<LlmCallConfig> => {
    const resolved = await next()
    const decision = router.route(payload, resolved)
    if (decision.changed) {
      ctx.logger.debug(
        `hooks-model-router: session ${String(payload.agent.id)} ${decision.reason}: `
        + `${resolved.provider}/${resolved.model} -> ${decision.config.provider}/${decision.config.model}`,
      )
    }
    return decision.config
  })

  ctx.on('agent/turn-stopping', ({ agent, turn }) => {
    const role = router.nextWorkflowRole(agent.session, turn)
    if (role === undefined) return
    const instruction = role === 'planner'
      ? 'Continue as Planner. Reassess the objective and produce the next concrete plan for this turn.'
      : role === 'executor'
        ? 'Continue as Executor. Act on the plan and review feedback, using tools when needed, and complete the task.'
        : 'Continue as Reviewer. Check the work so far for correctness, omissions, and risks. Make corrections when needed.'
    agent.steer(createUserMessage({
      content: [{
        type: 'text',
        text: instruction,
      }],
      source: {
        kind: 'plugin',
        plugin: name,
        form: 'notice',
        summary: `Automatic ${role} workflow stage`,
      },
    }))
  })
}

export { ModelRouter } from './router.ts'
export type {
  ModelTarget,
  RouteDecision,
  RouteRequest,
  RoutedRole,
  RouterConfig,
  RouterPhase,
} from './router.ts'
