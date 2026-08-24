import z from '@deepseek-ai/schemastery';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import { registerRouterCommands } from "./command.js";
import { ModelRouter } from "./router.js";
export const name = 'hooks-model-router';
export const inject = ['commands'];
// schemastery object fields are optional unless their inner fields are
// .required(); a nested target must stay all-optional so an unconfigured
// plugin loads (empty composition config). The router guards completeness.
const modelTarget = z.object({
    provider: z.string(),
    model: z.string(),
});
export const Config = z.object({
    enabled: z.boolean().default(false),
    // Default false: role routing is the point of this plugin; the initial
    // dialog selection equals the agent baseline and cannot be distinguished
    // from a default (agent/request carries no selection provenance).
    respectUserSelection: z.boolean().default(false),
    planner: modelTarget,
    executor: modelTarget,
    reviewer: modelTarget,
    rule: z.union(['auto', 'manual']).default('auto'),
});
const NS = settingsNamespace('model-router');
export function apply(ctx, config) {
    let current = () => config;
    installSettingsSection(ctx, NS, Config, config, {
        setSource: source => { current = source; },
        onChange: () => { },
    });
    const router = new ModelRouter(() => current());
    registerRouterCommands(ctx, router);
    // Scoped events are globally observable from a root Context. The payload's
    // exact Agent owns both the session history and the per-session phase key.
    ctx.on('agent/request', async (payload, next) => {
        const resolved = await next();
        const decision = router.route(payload, resolved);
        if (decision.changed) {
            ctx.logger.debug(`hooks-model-router: session ${String(payload.agent.id)} ${decision.reason}: `
                + `${resolved.provider}/${resolved.model} -> ${decision.config.provider}/${decision.config.model}`);
        }
        return decision.config;
    });
}
export { ModelRouter } from "./router.js";
//# sourceMappingURL=index.js.map