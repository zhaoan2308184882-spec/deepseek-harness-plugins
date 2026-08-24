import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { RouterConfig } from './router.ts';
export declare const name = "hooks-model-router";
export declare const inject: string[];
interface UsageOffset {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
}
export interface Config extends RouterConfig {
    /** Per-route display baselines; resetting never mutates durable session history. */
    usageOffsets?: Record<string, UsageOffset>;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
export { ModelRouter } from './router.ts';
export type { ModelTarget, RouteDecision, RouteRequest, RoutedRole, RouterConfig, RouterPhase, } from './router.ts';
//# sourceMappingURL=index.d.ts.map