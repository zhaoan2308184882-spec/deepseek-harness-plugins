/**
 * Register a local Codex CLI adapter on the DSH LLM seam. Configuration is
 * resolved per operation, so settings changes affect the next request while
 * an in-flight request keeps the snapshot it started with.
 * @module @zhaoan2308184882-spec/dsh-llm-codex
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { CodexCatalogModel, CodexConnectionOptions, SandboxMode } from './adapter.ts';
export { CodexAdapter, discoverCodexModels, resolveCodexBinary, resolveModelContextWindow } from './adapter.ts';
export type { CodexAdapterOptions, CodexCatalogModel, CodexConnectionOptions, SandboxMode } from './adapter.ts';
export { serialize } from './serialize.ts';
export declare const name = "llm-codex";
export declare const inject: string[];
/** Settings-section shape for the local Codex CLI provider. */
export interface Config {
    codexPath?: string;
    codexHome?: string;
    cwd?: string;
    sandboxMode?: SandboxMode;
    /** Default reasoning effort materialized when the caller omits one; defaults to 'low'. */
    defaultReasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra';
    models?: CodexCatalogModel[];
}
export declare const Config: z<Config>;
/** Resolve and validate one immutable configuration generation. */
export declare function resolveAdapterOptions(config: Config): CodexConnectionOptions;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map