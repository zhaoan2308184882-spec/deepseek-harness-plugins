import zod from 'zod'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const bucketsSchema = zod.object({
  inputTokens: zod.number().nonnegative(),
  outputTokens: zod.number().nonnegative(),
  cacheReadTokens: zod.number().nonnegative(),
  cacheWriteTokens: zod.number().nonnegative(),
  reasoningTokens: zod.number().nonnegative(),
})

const routeSchema = zod.object({ provider: zod.string(), model: zod.string() })

export const routerUsageSchema = zod.object({
  current: routeSchema.optional(),
  last: routeSchema.extend({ turn: zod.number(), step: zod.number() }).optional(),
  routes: zod.record(zod.string(), bucketsSchema),
})

export type RouterUsage = zod.infer<typeof routerUsageSchema>
type Buckets = zod.infer<typeof bucketsSchema>

const emptyBuckets = (): Buckets => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
})

function routeKey(provider: string, model: string): string {
  return `${provider}\u0000${model}`
}

export const routerUsageProjectionDefinition = {
  key: 'routerUsage',
  stateVersion: 1,
  stateSchema: routerUsageSchema,
  init: (): RouterUsage => ({ routes: {} }),
  apply(state: RouterUsage, event: SessionEvent): RouterUsage {
    if (event.type === 'request/header') {
      const { provider, model } = event.data.header.config
      if (typeof provider !== 'string' || typeof model !== 'string') return state
      if (state.current?.provider === provider && state.current.model === model) return state
      return { ...state, current: { provider, model } }
    }
    if (event.type !== 'assistant/message' || event.data.usage === undefined || state.current === undefined) {
      return state
    }
    const usage = event.data.usage
    const key = routeKey(state.current.provider, state.current.model)
    const previous = state.routes[key] ?? emptyBuckets()
    return {
      ...state,
      last: { ...state.current, turn: event.data.turn, step: event.data.step },
      routes: {
        ...state.routes,
        [key]: {
          inputTokens: previous.inputTokens + usage.inputTokens,
          outputTokens: previous.outputTokens + usage.outputTokens,
          cacheReadTokens: previous.cacheReadTokens + (usage.cacheReadTokens ?? 0),
          cacheWriteTokens: previous.cacheWriteTokens + (usage.cacheWriteTokens ?? 0),
          reasoningTokens: previous.reasoningTokens + (usage.reasoningTokens ?? 0),
        },
      },
    }
  },
  wire: {
    viewSchema: routerUsageSchema,
    view: (state: RouterUsage): RouterUsage => state,
  },
}
