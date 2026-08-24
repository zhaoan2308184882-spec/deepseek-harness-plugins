/** Session-local controls intentionally disappear with the live Session object. */
export class ModelRouter {
    config;
    phases = new WeakMap();
    constructor(config) {
        this.config = config;
    }
    getPhase(session) {
        return this.phases.get(session) ?? 'auto';
    }
    setPhase(session, phase) {
        if (phase === 'auto')
            this.phases.delete(session);
        else
            this.phases.set(session, phase);
    }
    route(request, resolved) {
        const config = this.config();
        if (config.enabled !== true) {
            return { config: resolved, changed: false, reason: 'disabled' };
        }
        const explicitPhase = this.getPhase(request.agent.session);
        const role = this.selectRole(request, config, explicitPhase);
        const target = config[role];
        if (target === undefined
            || target.provider === undefined || target.model === undefined
            || target.provider.trim().length === 0 || target.model.trim().length === 0) {
            return { config: resolved, role, changed: false, reason: `no complete ${role} target configured` };
        }
        if ((config.respectUserSelection ?? false) && this.hasDownstreamSelection(request.agent, resolved)) {
            return { config: resolved, role, changed: false, reason: 'downstream user selection preserved' };
        }
        const changed = resolved.provider !== target.provider || resolved.model !== target.model;
        return {
            config: changed ? { ...resolved, provider: target.provider, model: target.model } : resolved,
            role,
            changed,
            reason: changed ? `${role} route applied` : `${role} route already selected`,
        };
    }
    selectRole(request, config, explicitPhase) {
        if (explicitPhase !== 'auto')
            return explicitPhase;
        if (config.rule === 'manual')
            return 'planner';
        if (request.turn === 1 && request.step === 1)
            return 'planner';
        return this.hasToolActivity(request.agent.session, request.turn) ? 'executor' : 'planner';
    }
    hasToolActivity(session, turn) {
        return session.events.some(event => ((event.type === 'tool/call' || event.type === 'tool/result')
            && event.data.turn === turn));
    }
    /**
     * agent/request exposes no explicit-selection marker. A downstream selector
     * changing the route away from immutable AgentOptions is the only reliable
     * observable signal; the base AgentOptions route remains eligible for rules.
     */
    hasDownstreamSelection(agent, resolved) {
        const baseProvider = agent.options.provider;
        const baseModel = agent.options.model;
        if (baseProvider === undefined || baseModel === undefined)
            return false;
        return resolved.provider !== baseProvider || resolved.model !== baseModel;
    }
}
//# sourceMappingURL=router.js.map