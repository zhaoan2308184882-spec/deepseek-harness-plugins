/** Convert DSH's structured conversation into the plain prompt Codex accepts. */
import type { Message } from '@deepseek-ai/dsh-llm';
/** Render system instructions and messages in conversation order. */
export declare function serialize(messages: readonly Message[], system?: string): string;
//# sourceMappingURL=serialize.d.ts.map