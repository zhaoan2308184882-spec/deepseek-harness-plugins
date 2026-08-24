import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'

export interface ModelTarget {
  /** Provider route; undefined when the target is incomplete (router keeps the resolved config). */
  provider?: string
  /** Model id; undefined when the target is incomplete (router keeps the resolved config). */
  model?: string
}

export type RouterPhase = 'auto' | 'planner' | 'executor' | 'reviewer'
export type RoutedRole = Exclude<RouterPhase, 'auto'>

export interface RouterConfig {
  enabled?: boolean
  /**
   * Preserve a model the user explicitly selected mid-session (the dialog
   * changes the route away from the agent's baseline). NOTE: the initial
   * dialog selection equals the agent baseline and is NOT distinguishable
   * here (agent/request carries no selection provenance), so it defaults to
   * false — role routing is the point of this plugin.
   */
  respectUserSelection?: boolean
  planner?: ModelTarget
  executor?: ModelTarget
  reviewer?: ModelTarget
  /** Ordered model-call stages used by automatic-review workflow mode. */
  sequence?: RoutedRole[]
  /** `review` adds one Reviewer pass when a turn would otherwise stop. */
  rule?: 'auto' | 'review' | 'manual'
}

export interface RouteRequest {
  agent: Agent
  turn: number
  step: number
}

export interface RouteDecision {
  config: LlmCallConfig
  role?: RoutedRole
  changed: boolean
  reason: string
}

/** Session-local controls intentionally disappear with the live Session object. */
export class ModelRouter {
  private readonly phases = new WeakMap<Session, RouterPhase>()
  private readonly continuedSteps = new WeakMap<Session, Map<number, number>>()

  constructor(private readonly config: () => RouterConfig) {}

  getPhase(session: Session): RouterPhase {
    return this.phases.get(session) ?? 'auto'
  }

  setPhase(session: Session, phase: RouterPhase): void {
    if (phase === 'auto') this.phases.delete(session)
    else this.phases.set(session, phase)
  }

  nextWorkflowRole(session: Session, turn: number): RoutedRole | undefined {
    const config = this.config()
    if (config.enabled !== true || config.rule !== 'review' || this.getPhase(session) !== 'auto') return undefined
    const sequence = this.sequence(config)
    const completedStep = session.events.reduce((max, event) => {
      const data = event.data as { turn?: number, step?: number }
      return data.turn === turn && typeof data.step === 'number' ? Math.max(max, data.step) : max
    }, 0)
    if (completedStep <= 0 || completedStep >= sequence.length) return undefined
    let turns = this.continuedSteps.get(session)
    if (turns === undefined) {
      turns = new Map<number, number>()
      this.continuedSteps.set(session, turns)
    }
    if (turns.get(turn) === completedStep) return undefined
    turns.set(turn, completedStep)
    return sequence[completedStep]
  }

  route(request: RouteRequest, resolved: LlmCallConfig): RouteDecision {
    const config = this.config()
    if (config.enabled !== true) {
      return { config: resolved, changed: false, reason: 'disabled' }
    }

    const explicitPhase = this.getPhase(request.agent.session)
    const role = this.selectRole(request, config, explicitPhase)
    const target = config[role]
    if (target === undefined
      || target.provider === undefined || target.model === undefined
      || target.provider.trim().length === 0 || target.model.trim().length === 0) {
      return { config: resolved, role, changed: false, reason: `no complete ${role} target configured` }
    }

    const changed = resolved.provider !== target.provider || resolved.model !== target.model
    // Reasoning effort is model-owned. Carrying (for example) Codex `high`
    // into a routed model that exposes no effort levels makes LlmRuntime reject
    // the call with UNSUPPORTED_REASONING_EFFORT. Match Harness' built-in model
    // selection behavior: a model switch clears inherited effort and lets the
    // target adapter choose its own default.
    const { reasoningEffort: _inheritedEffort, ...compatible } = resolved
    return {
      config: changed ? { ...compatible, provider: target.provider, model: target.model } : resolved,
      role,
      changed,
      reason: changed ? `${role} route applied` : `${role} route already selected`,
    }
  }

  private selectRole(
    request: RouteRequest,
    config: RouterConfig,
    explicitPhase: RouterPhase,
  ): RoutedRole {
    if (explicitPhase !== 'auto') return explicitPhase
    if (config.rule === 'review') {
      const sequence = this.sequence(config)
      return sequence[Math.min(Math.max(request.step - 1, 0), sequence.length - 1)]
    }
    if (request.turn === 1 && request.step === 1) return 'planner'
    return this.hasToolActivity(request.agent.session, request.turn) ? 'executor' : 'planner'
  }

  private sequence(config: RouterConfig): RoutedRole[] {
    // Custom workflow editing is intentionally disabled for now. Keep the
    // config field load-compatible so older settings files still boot.
    void config.sequence
    return ['planner', 'executor', 'reviewer']
  }

  private hasToolActivity(session: Session, turn: number): boolean {
    return session.events.some(event => (
      (event.type === 'tool/call' || event.type === 'tool/result')
      && event.data.turn === turn
    ))
  }

}
