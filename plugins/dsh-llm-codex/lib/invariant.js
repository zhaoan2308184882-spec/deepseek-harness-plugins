// plugins/dsh-llm-codex/src/invariant.ts
var PACKAGE_NAME = "@zhaoan2308184882-spec/dsh-llm-codex";
var name = "llm-codex-invariant";
var inject = ["invariants"];
var install = () => {
};
var apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
export {
  apply,
  inject,
  name
};
