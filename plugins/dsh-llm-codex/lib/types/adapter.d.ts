/** Local Codex CLI transport for the DSH LLM seam. */
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmDiscoveredModel, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm';
import { type AppServerApprovalRequest, type ApprovalOutcome } from './app-server.ts';
export type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';
export interface CodexCatalogModel {
    id: string;
    name?: string;
    contextWindow?: number;
    maxTokens?: number;
}
export interface CodexConnectionOptions {
    codexPath?: string;
    codexHome?: string;
    cwd?: string;
    sandboxMode: SandboxMode;
    defaultReasoningEffort?: string;
    models: readonly CodexCatalogModel[];
}
export interface CodexAdapterOptions {
    options: () => CodexConnectionOptions;
    /** Bridges Codex app-server approval requests into the owning DSH session. */
    requestApproval?: (request: AppServerApprovalRequest) => Promise<ApprovalOutcome>;
}
/** Models offered to Harness's native Models settings discovery UI. */
export declare function discoverCodexModels(connection: CodexConnectionOptions): LlmDiscoveredModel[];
/**
 * Resolve the selected model's largest window from Codex's own live catalog.
 * A configured value remains the fallback for offline/older Codex installs.
 */
export declare function resolveModelContextWindow(connection: CodexConnectionOptions, model: CodexCatalogModel): number | undefined;
/** Resolve a configured path, or a command name from PATH. */
export declare function resolveCodexBinary(configured?: string): Promise<string | undefined>;
export declare class CodexAdapter extends LlmAdapter {
    private readonly config;
    constructor(config: CodexAdapterOptions);
    providerInfo(provider: string): LlmProviderInfo;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    /**
     * Bind one generation's model metadata and dispatch to the same config
     * snapshot. The base LlmAdapter gained `prepareCall` in the 0.1.1-rc.2
     * series; a plugin bundled against an earlier dsh-llm re-implements the
     * delegation (no `override`, since the older base class does not declare it).
     */
    prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<{
        model: LlmResolvedModelInfo;
        stream: (options: GenerateOptions) => AsyncIterable<StreamChunk>;
    }>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
//# sourceMappingURL=adapter.d.ts.map