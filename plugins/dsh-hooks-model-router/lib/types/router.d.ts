import type { Agent } from '@deepseek-ai/dsh-agent';
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm';
import type { Session } from '@deepseek-ai/dsh-session';
export interface ModelTarget {
    /** Provider route; undefined when the target is incomplete (router keeps the resolved config). */
    provider?: string;
    /** Model id; undefined when the target is incomplete (router keeps the resolved config). */
    model?: string;
}
export type RouterPhase = 'auto' | 'planner' | 'executor' | 'reviewer';
export type RoutedRole = Exclude<RouterPhase, 'auto'>;
export interface RouterConfig {
    enabled?: boolean;
    /**
     * Preserve a model the user explicitly selected mid-session (the dialog
     * changes the route away from the agent's baseline). NOTE: the initial
     * dialog selection equals the agent baseline and is NOT distinguishable
     * here (agent/request carries no selection provenance), so it defaults to
     * false — role routing is the point of this plugin.
     */
    respectUserSelection?: boolean;
    planner?: ModelTarget;
    executor?: ModelTarget;
    reviewer?: ModelTarget;
    /** Ordered model-call stages used by automatic-review workflow mode. */
    sequence?: RoutedRole[];
    /** `review` adds one Reviewer pass when a turn would otherwise stop. */
    rule?: 'auto' | 'review' | 'manual';
}
export interface RouteRequest {
    agent: Agent;
    turn: number;
    step: number;
}
export interface RouteDecision {
    config: LlmCallConfig;
    role?: RoutedRole;
    changed: boolean;
    reason: string;
}
/** Session-local controls intentionally disappear with the live Session object. */
export declare class ModelRouter {
    private readonly config;
    private readonly phases;
    private readonly continuedSteps;
    constructor(config: () => RouterConfig);
    getPhase(session: Session): RouterPhase;
    setPhase(session: Session, phase: RouterPhase): void;
    nextWorkflowRole(session: Session, turn: number): RoutedRole | undefined;
    route(request: RouteRequest, resolved: LlmCallConfig): RouteDecision;
    private selectRole;
    private sequence;
    private hasToolActivity;
}
//# sourceMappingURL=router.d.ts.map