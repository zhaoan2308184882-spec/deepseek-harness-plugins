/**
 * Register a local Codex CLI adapter on the DSH LLM seam. Configuration is
 * resolved per operation, so settings changes affect the next request while
 * an in-flight request keeps the snapshot it started with.
 * @module @zhaoan2308184882-spec/dsh-llm-codex
 */
import z from '@deepseek-ai/schemastery';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import { CodexAdapter } from "./adapter.js";
export { CodexAdapter } from "./adapter.js";
export { serialize } from "./serialize.js";
export const name = 'llm-codex';
export const inject = ['llm'];
const NS = settingsNamespace('llm-codex');
const PROVIDER = 'codex';
// ChatGPT-account (subscription) codex models, per ~/.codex/models_cache.json
// (slug list). API-billing ids like gpt-5.1-codex-mini are NOT supported here.
const DEFAULT_MODELS = [
    { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', contextWindow: 272000 },
    { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', contextWindow: 272000 },
    { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', contextWindow: 272000 },
    { id: 'gpt-5.5', name: 'GPT-5.5', contextWindow: 272000 },
    { id: 'gpt-5.4', name: 'GPT-5.4', contextWindow: 272000 },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', contextWindow: 272000 },
];
const catalogModel = z.object({
    id: z.string().required(),
    name: z.string(),
    contextWindow: z.number().step(1).min(1),
    maxTokens: z.number().step(1).min(1),
});
export const Config = z.object({
    codexPath: z.string(),
    codexHome: z.string(),
    cwd: z.string(),
    sandboxMode: z.union(['read-only', 'workspace-write', 'danger-full-access']).default('read-only'),
    defaultReasoningEffort: z.union(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']).default('low'),
    models: z.array(catalogModel).default(DEFAULT_MODELS),
});
function resolveModels(models) {
    const seen = new Set();
    return (models ?? DEFAULT_MODELS).map((model) => {
        if (model.id.length === 0)
            throw new Error('llm-codex: catalog model ids must be non-empty');
        if (model.name !== undefined && model.name.length === 0) {
            throw new Error(`llm-codex: catalog model "${model.id}" has an empty name`);
        }
        if (model.contextWindow !== undefined
            && (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)) {
            throw new Error(`llm-codex: catalog model "${model.id}" contextWindow must be a positive safe integer`);
        }
        if (model.maxTokens !== undefined
            && (!Number.isSafeInteger(model.maxTokens) || model.maxTokens <= 0)) {
            throw new Error(`llm-codex: catalog model "${model.id}" maxTokens must be a positive safe integer`);
        }
        if (seen.has(model.id))
            throw new Error(`llm-codex: duplicate catalog model "${model.id}"`);
        seen.add(model.id);
        return { ...model };
    });
}
/** Resolve and validate one immutable configuration generation. */
export function resolveAdapterOptions(config) {
    const stringOption = (value, field) => {
        if (value === undefined)
            return undefined;
        const trimmed = value.trim();
        if (trimmed.length === 0)
            throw new Error(`llm-codex: ${field} must not be blank`);
        return trimmed;
    };
    const codexPath = stringOption(config.codexPath, 'codexPath');
    const codexHome = stringOption(config.codexHome, 'codexHome');
    const cwd = stringOption(config.cwd, 'cwd');
    return {
        ...codexPath === undefined ? {} : { codexPath },
        ...codexHome === undefined ? {} : { codexHome },
        ...cwd === undefined ? {} : { cwd },
        sandboxMode: config.sandboxMode ?? 'read-only',
        defaultReasoningEffort: config.defaultReasoningEffort ?? 'low',
        models: resolveModels(config.models),
    };
}
export function apply(ctx, config) {
    let current = () => config;
    let lastRaw;
    let lastGood;
    const options = () => {
        const raw = current();
        if (raw === lastRaw && lastGood !== undefined)
            return lastGood;
        try {
            const next = resolveAdapterOptions(raw);
            lastRaw = raw;
            lastGood = next;
            return next;
        }
        catch (error) {
            if (lastGood === undefined)
                throw error;
            lastRaw = raw;
            ctx.logger.error('llm-codex: keeping the last good configuration after an invalid settings section');
            ctx.logger.error(error);
            return lastGood;
        }
    };
    options();
    const adapter = new CodexAdapter({ options });
    ctx.llm.registerConfigurableProviders([
        { provider: PROVIDER, displayName: 'Codex', settingsNs: NS, settingsPath: [] },
    ]);
    ctx.llm.registerAdapter([PROVIDER], adapter);
    installSettingsSection(ctx, NS, Config, config, {
        setSource: source => { current = source; },
        onChange: () => { options(); },
    });
}
//# sourceMappingURL=index.js.map