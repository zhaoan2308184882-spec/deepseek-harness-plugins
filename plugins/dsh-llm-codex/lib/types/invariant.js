/**
 * Package-owned invariant companion for `@zhaoan2308184882-spec/dsh-llm-codex`.
 * @module @zhaoan2308184882-spec/dsh-llm-codex/invariant
 */
const PACKAGE_NAME = '@zhaoan2308184882-spec/dsh-llm-codex';
export const name = 'llm-codex-invariant';
export const inject = ['invariants'];
/** The adapter owns no independent mutable relation beyond the LLM seam. */
const install = () => { };
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map