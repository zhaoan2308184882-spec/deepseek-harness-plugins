/** Bidirectional Codex app-server transport with DSH-owned approvals. */
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable';
export interface AppServerConnection {
    bin: string;
    codexHome: string;
    cwd: string;
    sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
}
export interface AppServerApprovalRequest {
    sessionId: NonNullable<GenerateOptions['sessionId']>;
    toolName: string;
    reason: string;
    signal?: AbortSignal;
}
export interface AppServerOptions {
    connection: AppServerConnection;
    generation: GenerateOptions;
    prompt: string;
    requestApproval: (request: AppServerApprovalRequest) => Promise<ApprovalOutcome>;
}
/** Run one ephemeral Codex thread while forwarding sandbox asks to DSH. */
export declare function streamViaAppServer(options: AppServerOptions): AsyncIterable<StreamChunk>;
//# sourceMappingURL=app-server.d.ts.map